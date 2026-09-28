import {
  CallHandler, CanActivate, ExecutionContext, ForbiddenException, Injectable,
  NestInterceptor, ServiceUnavailableException, SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';

type AccessPolicy = 'public' | 'fleet' | 'admin' | 'assigned';
type VmmsRole = 'ADMIN' | 'OPERATIONS' | 'CHIEF_MECHANIC' | 'MECHANIC';
type JsonRecord = Record<string, unknown>;
const ACCESS_POLICY = 'vmms:analytics-access';
export const AnalyticsAccess = (policy: AccessPolicy) => SetMetadata(ACCESS_POLICY, policy);

interface AnalyticsRequest {
  headers: { authorization?: string };
  params: { id?: string };
  analyticsAccess?: { role: VmmsRole; scheduleStatus?: string };
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class AnalyticsAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // New business endpoints are fleet-only unless explicitly scoped otherwise.
    const policy = this.reflector.getAllAndOverride<AccessPolicy>(ACCESS_POLICY, [
      context.getHandler(), context.getClass(),
    ]) ?? 'fleet';
    if (policy === 'public') return true;

    const request = context.switchToHttp().getRequest<AnalyticsRequest>();
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/i.test(authorization)) {
      throw new UnauthorizedException('A valid bearer session is required.');
    }

    // The core API verifies the signature, expiry, lockout and current account state.
    // Do not cache roles or assignments from JWT claims or the analytics snapshot.
    const user = await this.coreGet('auth/me?system=VMMS', authorization);
    if (!isRecord(user) || typeof user.id !== 'string' || !user.id ||
        user.isActive !== true || user.isLocked !== false || user.lockedAt != null ||
        !Array.isArray(user.roles)) {
      throw new UnauthorizedException('Invalid session.');
    }
    const roles = user.roles.filter((entry): entry is JsonRecord =>
      isRecord(entry) && entry.system === 'VMMS');
    const role = roles[0]?.role as VmmsRole;
    if (roles.length !== 1 || !['ADMIN', 'OPERATIONS', 'CHIEF_MECHANIC', 'MECHANIC'].includes(role)) {
      throw new ForbiddenException('A single valid VMMS role is required.');
    }
    const fleet = role === 'ADMIN' || role === 'OPERATIONS';
    if ((policy === 'fleet' && !fleet) || (policy === 'admin' && role !== 'ADMIN')) {
      throw new ForbiddenException('This analytics resource is restricted to authorized management roles.');
    }
    request.analyticsAccess = { role };

    if (policy === 'assigned') {
      const id = request.params.id;
      if (!id) throw new ForbiddenException('A current work order is required.');
      const schedules = await this.coreGet('maintenance-schedules?system=VMMS', authorization);
      if (!Array.isArray(schedules)) {
        throw new ServiceUnavailableException('Work order access could not be verified.');
      }
      const schedule = schedules.find((entry): entry is JsonRecord =>
        isRecord(entry) && entry.id === id && entry.deletedAt == null);
      // Check stable user IDs as well as the core API's scoped response. Names and
      // client-supplied mechanic filters must never grant access.
      if (!schedule || (!fleet && (
        role === 'MECHANIC' ? schedule.assignedMechanicId !== user.id : schedule.chiefMechanicId !== user.id
      ))) {
        throw new ForbiddenException('You cannot access this work order.');
      }
      request.analyticsAccess.scheduleStatus = String(schedule.status);
    }
    return true;
  }

  private async coreGet(path: string, authorization: string): Promise<unknown> {
    const base = (process.env.VMMS_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/${path}`, {
        headers: { Authorization: authorization, Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('Session verification is temporarily unavailable.');
    }
    if (response.status === 401) throw new UnauthorizedException('Invalid session.');
    if (response.status === 403) throw new ForbiddenException('Access denied by the core API.');
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
      // Allowlist the mobile response, including nested records; future analytics
      // fields and raw progress JSON must not silently expose financial data.
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
