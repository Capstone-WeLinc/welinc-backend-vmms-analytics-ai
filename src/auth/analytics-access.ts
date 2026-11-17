import {
  CallHandler,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { map } from 'rxjs/operators';
import { AccountCheck } from './account-check';
import { checkPerson, TOKEN_VERIFIER } from './verify/guards';
import { TokenVerifier } from './verify/token-verifier';

type AccessPolicy = 'public' | 'fleet' | 'admin' | 'assigned' | 'assigned-ai';
type VmmsRole = 'ADMIN' | 'OPERATIONS' | 'CHIEF_MECHANIC' | 'MECHANIC';
type JsonRecord = Record<string, unknown>;
const ACCESS_POLICY = 'vmms:analytics-access';
export const AnalyticsAccess = (policy: AccessPolicy) => SetMetadata(ACCESS_POLICY, policy);

interface AnalyticsRequest extends Request {
  params: { id?: string };
  analyticsAccess?: { role: VmmsRole; scheduleStatus?: string };
}

const AI_RATE_WINDOW_MS = 60_000;
const AI_USER_LIMIT_PER_WINDOW = 5;
const AI_SERVICE_LIMIT_PER_WINDOW = 12;
const AI_RATE_LIMIT_MAX_USERS = 5_000;

type RateWindow = { startedAt: number; count: number };

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class AnalyticsAccessGuard implements CanActivate {
  private readonly vmmsApiBaseUrl: string;
  private readonly recommendationWindows = new Map<string, RateWindow>();
  private serviceWindow: RateWindow = { startedAt: 0, count: 0 };

  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    private readonly accountCheck: AccountCheck,
    config: ConfigService,
  ) {
    this.vmmsApiBaseUrl = (config.get<string>('VMMS_API_BASE_URL') ?? '').replace(/\/+$/, '');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<AccessPolicy>(ACCESS_POLICY, [
      context.getHandler(), context.getClass(),
    ]) ?? 'fleet';
    if (policy === 'public') return true;

    const request = context.switchToHttp().getRequest<AnalyticsRequest>();
    const { raw, token } = await checkPerson(this.verifier, request);
    const { user } = await this.accountCheck.confirm(raw, token);
    const roles = user.roles.filter((entry) => entry.system === 'VMMS');
    const role = roles[0]?.role as VmmsRole;
    if (roles.length !== 1 || !['ADMIN', 'OPERATIONS', 'CHIEF_MECHANIC', 'MECHANIC'].includes(role)) {
      throw new ForbiddenException('A single valid VMMS role is required.');
    }
    const fleet = role === 'ADMIN' || role === 'OPERATIONS';
    if ((policy === 'fleet' && !fleet) || (policy === 'admin' && role !== 'ADMIN')) {
      throw new ForbiddenException('This analytics resource is restricted to authorized management roles.');
    }
    request.analyticsAccess = { role };

    if (policy === 'assigned' || policy === 'assigned-ai') {
      const id = request.params.id;
      if (!id) throw new ForbiddenException('A current work order is required.');
      const schedules = await this.coreGet('maintenance-schedules?system=VMMS', raw);
      if (!Array.isArray(schedules)) {
        throw new ServiceUnavailableException('Work order access could not be verified.');
      }
      const schedule = schedules.find((entry): entry is JsonRecord =>
        isRecord(entry) && entry.id === id && entry.deletedAt == null);
      if (!schedule || (!fleet && (
        role === 'MECHANIC' ? schedule.assignedMechanicId !== user.sub : schedule.chiefMechanicId !== user.sub
      ))) {
        throw new ForbiddenException('You cannot access this work order.');
      }
      request.analyticsAccess.scheduleStatus = String(schedule.status);
    }
    if (policy === 'assigned-ai') this.consumeRecommendationBudget(user.sub);
    return true;
  }

  private consumeRecommendationBudget(userId: string): void {
    const now = Date.now();
    if (now - this.serviceWindow.startedAt >= AI_RATE_WINDOW_MS) {
      this.serviceWindow = { startedAt: now, count: 0 };
    }

    let userWindow = this.recommendationWindows.get(userId);
    if (!userWindow || now - userWindow.startedAt >= AI_RATE_WINDOW_MS) {
      if (!userWindow && this.recommendationWindows.size >= AI_RATE_LIMIT_MAX_USERS) {
        for (const [key, window] of this.recommendationWindows) {
          if (now - window.startedAt >= AI_RATE_WINDOW_MS) this.recommendationWindows.delete(key);
        }
      }
      if (!userWindow && this.recommendationWindows.size >= AI_RATE_LIMIT_MAX_USERS) {
        throw new HttpException('AI recommendation capacity is temporarily busy.', HttpStatus.TOO_MANY_REQUESTS);
      }
      userWindow = { startedAt: now, count: 0 };
    }

    if (userWindow.count >= AI_USER_LIMIT_PER_WINDOW || this.serviceWindow.count >= AI_SERVICE_LIMIT_PER_WINDOW) {
      throw new HttpException('AI recommendation limit reached. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    userWindow.count++;
    this.recommendationWindows.set(userId, userWindow);
    this.serviceWindow.count++;
  }

  private async coreGet(path: string, token: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.vmmsApiBaseUrl}/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('Session verification is temporarily unavailable.');
    }
    if (response.status === 401) throw new ServiceUnavailableException('The VMMS API refused the current session.');
    if (response.status === 403) throw new ForbiddenException('Access denied by the VMMS API.');
    if (!response.ok) throw new ServiceUnavailableException('Access verification is temporarily unavailable.');
    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableException('Invalid access verification response.');
    }
  }
}

function pickScalars(source: JsonRecord, fields: string[]): JsonRecord {
  return Object.fromEntries(fields.filter((field) => {
    const value = source[field];
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
  }).map((field) => [field, source[field]]));
}

@Injectable()
export class AnalyticsResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const access = context.switchToHttp().getRequest<AnalyticsRequest>().analyticsAccess;
    if (!access || access.role === 'ADMIN' || access.role === 'OPERATIONS') return next.handle();
    return next.handle().pipe(map((result: unknown) => {
      if (!isRecord(result)) throw new ServiceUnavailableException('Invalid work order response.');
      const output = pickScalars(result, ['scheduleId', 'title', 'vehiclePlate', 'aiRecommendations']);
      if (isRecord(result.workOrder)) {
        const fields = ['scheduleId', 'vehiclePlate', 'maintenanceTitle', 'triggerType',
          'intervalType', 'mechanic', 'status', 'odometerReading', 'nextDueDate',
          'createdAt', 'daysOpen', 'daysOverdue', 'priority', 'statusLabel'];
        if (access.role === 'CHIEF_MECHANIC' && ['DONE', 'COMPLETED'].includes(access.scheduleStatus ?? '')) {
          fields.push('partsCost', 'laborCost', 'totalCost');
        }
        output.workOrder = pickScalars(result.workOrder, fields);
      } else if (result.workOrder === null) {
        output.workOrder = null;
      }
      if (Array.isArray(result.checklist)) {
        output.checklist = result.checklist.filter(isRecord).map((item) =>
          pickScalars(item, ['stepNumber', 'title', 'description', 'priority']));
      }
      return output;
    }));
  }
}
