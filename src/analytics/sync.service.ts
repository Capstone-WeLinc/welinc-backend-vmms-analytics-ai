import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MaintenanceStatus, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  initializeDataMart,
  MaintenanceAlertRow,
  MaintenanceMonthlyTrendRow,
  MaintenanceScheduleSummaryRow,
  MaintenanceStatusSummaryRow,
  PreparedAnalyticsRows,
  replacePreparedAnalytics,
  replaceMaintenanceScheduleSummary,
  replaceVehicleSummary,
  VehicleMaintenanceKpiRow,
  VehicleSummaryRow,
} from './duckdb';
import { AnalyticsService } from './analytics.service';
import { DuckDbDataMartService } from './duckdb-datamart.service';

function dbPoolLimit(): number {
  const value = Number(process.env['DB_POOL_MAX']);
  return Number.isSafeInteger(value) && value > 0 ? value : 2;
}

const STATUS_ORDER = [
  MaintenanceStatus.PENDING,
  MaintenanceStatus.DUE,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.COMPLETED,
  MaintenanceStatus.OVERDUE,
  MaintenanceStatus.CANCELLED,
] as const;

const ACTIVE_STATUSES = new Set<MaintenanceStatus>([
  MaintenanceStatus.DUE,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.OVERDUE,
]);

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function numericValue(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'object') {
    if (
      'toNumber' in (value as any) &&
      typeof (value as any).toNumber === 'function'
    ) {
      const num = (value as any).toNumber();
      return Number.isFinite(num) ? num : 0;
    }
  }
  const str = String(value).trim();
  if (!str) return 0;
  const parsed = Number(str.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumFieldFromObject(value: unknown, targetKeys: string[]): number {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => total + sumFieldFromObject(item, targetKeys),
      0,
    );
  }
  if (typeof value !== 'object') return 0;

  if (
    ('toNumber' in (value as any) &&
      typeof (value as any).toNumber === 'function') ||
    value instanceof Date
  ) {
    return 0;
  }

  let sum = 0;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (targetKeys.includes(key)) {
      sum += numericValue(child);
    } else if (child && typeof child === 'object') {
      sum += sumFieldFromObject(child, targetKeys);
    }
  }
  return sum;
}

function schedulePartsCost(schedule: {
  partsCost: unknown;
  workOrderProgress?: unknown;
}): number {
  const parts = numericValue(schedule.partsCost);
  if (parts > 0) return parts;

  if (schedule.workOrderProgress) {
    const fromJson = sumFieldFromObject(schedule.workOrderProgress, [
      'partsCost',
      'parts_cost',
    ]);
    if (fromJson > 0) return fromJson;
  }
  return 0;
}

function scheduleLaborCost(schedule: {
  laborCost: unknown;
  workOrderProgress?: unknown;
}): number {
  const labor = numericValue(schedule.laborCost);
  if (labor > 0) return labor;

  if (schedule.workOrderProgress) {
    const fromJson = sumFieldFromObject(schedule.workOrderProgress, [
      'laborCost',
      'labor_cost',
    ]);
    if (fromJson > 0) return fromJson;
  }
  return 0;
}

/** Derive maintenance cost from dedicated scalar columns or workOrderProgress JSON (totalCost preferred). */
function scheduleTotalCost(schedule: {
  totalCost: unknown;
  partsCost: unknown;
  laborCost: unknown;
  workOrderProgress?: unknown;
}): number {
  const total = numericValue(schedule.totalCost);
  if (total > 0) return total;

  const parts = schedulePartsCost(schedule);
  const labor = scheduleLaborCost(schedule);
  if (parts + labor > 0) return parts + labor;

  if (schedule.workOrderProgress) {
    const fromJson = sumFieldFromObject(schedule.workOrderProgress, [
      'totalCost',
      'total_cost',
      'cost',
    ]);
    if (fromJson > 0) return fromJson;
  }

  return 0;
}


function analyticsStatus(
  status: MaintenanceStatus,
  _dueDate: Date | null,
  _generatedAt: Date,
): MaintenanceStatus {
  return status;
}

function utcMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastSixMonthKeys(generatedAt: Date): string[] {
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(
      Date.UTC(
        generatedAt.getUTCFullYear(),
        generatedAt.getUTCMonth() - (5 - index),
        1,
      ),
    );
    return utcMonthKey(month);
  });
}

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private pool: pg.Pool | null = null;
  private prisma: PrismaClient | null = null;
  private listenClient: pg.Client | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly dataMartService: DuckDbDataMartService,
  ) {}

  async onModuleInit(): Promise<void> {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      this.logger.warn('DATABASE_URL is not set. Auto-sync disabled.');
      return;
    }

    this.pool = new pg.Pool({ connectionString, max: Math.max(1, dbPoolLimit() - 1), connectionTimeoutMillis: 2000, query_timeout: 2000 });
    this.prisma = new PrismaClient({ adapter: new PrismaPg(this.pool) });


    const syncOnStartup = process.env['SYNC_ON_STARTUP'] !== 'false';
    if (syncOnStartup) {
      this.logger.log('Running initial PostgreSQL -> DuckDB sync...');
      await this.syncNow().catch((err) =>
        this.logger.error('Startup sync failed:', err),
      );
    }

    // Schedule fallback periodic sync (5 seconds for real-time responsiveness)
    const fallbackSeconds = Number(
      process.env['SYNC_FALLBACK_INTERVAL_SECONDS'] ?? 5,
    );
    const intervalMs =
      (Number.isFinite(fallbackSeconds) && fallbackSeconds > 0
        ? fallbackSeconds
        : 5) * 1000;
    this.intervalTimer = setInterval(() => {
      this.syncNow().catch((err) =>
        this.logger.error('Periodic sync failed:', err),
      );
    }, intervalMs);

    // Setup PostgreSQL LISTEN/NOTIFY for real-time updates
    if (dbPoolLimit() > 1) this.setupListenNotify(connectionString);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (this.listenClient) {
      try {
        await this.listenClient.end();
      } catch {}
    }

    if (this.prisma) {
      await this.prisma.$disconnect().catch(() => undefined);
    }

    if (this.pool) {
      await this.pool.end().catch(() => undefined);
    }
  }

  private setupListenNotify(connectionString: string): void {
    try {
      this.listenClient = new pg.Client({ connectionString });
      this.listenClient.connect(async (err) => {
        if (err) {
          this.logger.warn(
            `Failed to connect PG LISTEN client: ${err.message}. Relying on fallback timer.`,
          );
          return;
        }
        this.logger.log('Connected PG LISTEN client for real-time sync.');

        const channels = ['vmms_data_changed', 'vehicles_changed', 'schedules_changed'];
        for (const ch of channels) {
          try {
            await this.listenClient?.query(`LISTEN ${ch}`);
          } catch {}
        }

        this.listenClient?.on('notification', (msg) => {
          this.logger.log(`Received PG NOTIFY on channel: ${msg.channel}`);
          this.scheduleDebouncedSync();
        });

        this.listenClient?.on('error', (clientErr) => {
          this.logger.warn(`PG LISTEN client error: ${clientErr.message}`);
        });
      });
    } catch (err) {
      this.logger.warn(`Could not set up LISTEN/NOTIFY: ${err}`);
    }
  }

  private scheduleDebouncedSync(): void {
    const debounceMs = Number(process.env['SYNC_DEBOUNCE_MS'] ?? 500);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.syncNow().catch((err) =>
        this.logger.error('Debounced sync failed:', err),
      );
    }, debounceMs);
  }

  async checkDatabase(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async syncNow(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: true, message: 'Sync already in progress.' };
    }
    if (!this.prisma) {
      const connectionString = process.env['DATABASE_URL'];
      if (!connectionString) {
        throw new Error('DATABASE_URL is not configured.');
      }
      this.pool = new pg.Pool({ connectionString, max: Math.max(1, dbPoolLimit() - 1), connectionTimeoutMillis: 2000, query_timeout: 2000 });
      this.prisma = new PrismaClient({ adapter: new PrismaPg(this.pool) });
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      const duckdb = await this.dataMartService.getConnection();
      await initializeDataMart(duckdb);

      const [vehicles, schedules] = await Promise.all([
          this.prisma.vehicle.findMany({
            where: { deletedAt: null },
            select: {
              id: true,
              plateNumber: true,
              model: true,
              status: true,
              odometer: true,
              updatedAt: true,
            },
          }),
          this.prisma.maintenanceSchedule.findMany({
            where: { deletedAt: null },
            select: {
              id: true,
              vehicleId: true,
              title: true,
              triggerType: true,
              intervalType: true,
              assignedMechanic: true,
              status: true,
              odometerReading: true,
              startReferenceDate: true,
              createdAt: true,
              updatedAt: true,
              partsCost: true,
              laborCost: true,
              totalCost: true,
              workOrderProgress: true,
            },
          }),
        ]);


        type VehicleRecord = (typeof vehicles)[number];
        type ScheduleRecord = (typeof schedules)[number];

        const schedulesByPlate = new Map<string, ScheduleRecord[]>();
        for (const schedule of schedules) {
          const current = schedulesByPlate.get(schedule.vehicleId) ?? [];
          current.push(schedule);
          schedulesByPlate.set(schedule.vehicleId, current);
        }
        const vehicleById = new Map<string, VehicleRecord>(
          vehicles.map((vehicle) => [vehicle.id, vehicle]),
        );

        const vehicleRows: VehicleSummaryRow[] = vehicles.map((vehicle) => {
          const matching = schedulesByPlate.get(vehicle.id) ?? [];
          const latest = matching.reduce<Date | null>(
            (current, schedule) =>
              !current || schedule.createdAt > current
                ? schedule.createdAt
                : current,
            null,
          );
          return {
            vehicleId: vehicle.id,
            plateNumber: vehicle.plateNumber,
            vehicleModel: vehicle.model,
            vehicleStatus: vehicle.status,
            currentOdometer: vehicle.odometer,
            totalMaintenanceSchedules: matching.length,
            latestMaintenanceDate: latest,
          };
        });

        const generatedAt = new Date();
        const startOfToday = new Date(
          Date.UTC(
            generatedAt.getUTCFullYear(),
            generatedAt.getUTCMonth(),
            generatedAt.getUTCDate(),
          ),
        );
        const dueSoonCutoff = new Date(
          startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000,
        );

        const scheduleStatusMap = new Map<string, MaintenanceStatus>(
          schedules.map((schedule) => [
            schedule.id,
            analyticsStatus(
              schedule.status,
              schedule.startReferenceDate,
              generatedAt,
            ),
          ]),
        );

        const scheduleRows: MaintenanceScheduleSummaryRow[] = schedules.map(
          (schedule) => ({
            scheduleId: schedule.id,
            vehiclePlate:
              vehicleById.get(schedule.vehicleId)?.plateNumber ??
              schedule.vehicleId,
            maintenanceTitle: schedule.title,
            triggerType: schedule.triggerType,
            intervalType: schedule.intervalType,
            assignedMechanic: schedule.assignedMechanic ?? '',
            scheduleStatus: scheduleStatusMap.get(schedule.id) ?? schedule.status,
            odometerReading: schedule.odometerReading,
            nextDueDate: schedule.startReferenceDate,
            partsCost: round(schedulePartsCost(schedule)),
            laborCost: round(scheduleLaborCost(schedule)),
            totalCost: round(scheduleTotalCost(schedule)),

            createdAt: schedule.createdAt,
          }),
        );

        const scheduleCost = new Map<string, number>(
          schedules.map((schedule) => [
            schedule.id,
            round(scheduleTotalCost(schedule)),
          ]),
        );

        const isDueWithin7Days = (schedule: ScheduleRecord) => {
          const status = scheduleStatusMap.get(schedule.id)!;
          const dueDate = schedule.startReferenceDate;
          return (
            status === MaintenanceStatus.DUE ||
            (status !== MaintenanceStatus.COMPLETED &&
              status !== MaintenanceStatus.CANCELLED &&
              status !== MaintenanceStatus.OVERDUE &&
              dueDate !== null &&
              dueDate.getTime() >= startOfToday.getTime() &&
              dueDate.getTime() <= dueSoonCutoff.getTime())
          );
        };

        const statusCounts = new Map<MaintenanceStatus, number>(
          STATUS_ORDER.map((status) => [status, 0]),
        );
        for (const status of scheduleStatusMap.values()) {
          statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
        }

        const statusSummary: MaintenanceStatusSummaryRow[] = STATUS_ORDER.map(
          (status) => {
            const scheduleCount = statusCounts.get(status) ?? 0;
            return {
              status,
              scheduleCount,
              percentage: schedules.length
                ? round((scheduleCount / schedules.length) * 100)
                : 0,
            };
          },
        );

        const monthlyTrends: MaintenanceMonthlyTrendRow[] = lastSixMonthKeys(
          generatedAt,
        ).map((monthKey) => {
          const matching = schedules.filter(
            (schedule) =>
              utcMonthKey(schedule.startReferenceDate ?? schedule.createdAt) ===
              monthKey,
          );
          return {
            monthKey,
            scheduledCount: matching.length,
            completedCount: matching.filter(
              (schedule) =>
                scheduleStatusMap.get(schedule.id) ===
                MaintenanceStatus.COMPLETED,
            ).length,
            activeCount: matching.filter((schedule) =>
              ACTIVE_STATUSES.has(scheduleStatusMap.get(schedule.id)!),
            ).length,
            overdueCount: matching.filter(
              (schedule) =>
                scheduleStatusMap.get(schedule.id) ===
                MaintenanceStatus.OVERDUE,
            ).length,
            maintenanceCost: round(
              matching.reduce(
                (total, schedule) =>
                  total + (scheduleCost.get(schedule.id) ?? 0),
                0,
              ),
            ),
          };
        });

        const schedulesForVehicle = (vehicle: VehicleRecord) =>
          [
            ...(schedulesByPlate.get(vehicle.plateNumber) ?? []),
            ...(schedulesByPlate.get(vehicle.id) ?? []),
          ].filter(
            (schedule, index, rows) =>
              rows.findIndex((candidate) => candidate.id === schedule.id) ===
              index,
          );

        const vehicleKpis: VehicleMaintenanceKpiRow[] = vehicles.map(
          (vehicle) => {
            const matching = schedulesForVehicle(vehicle);
            const active = matching.filter((schedule) =>
              ACTIVE_STATUSES.has(scheduleStatusMap.get(schedule.id)!),
            );
            const completed = matching.filter(
              (schedule) =>
                scheduleStatusMap.get(schedule.id) ===
                MaintenanceStatus.COMPLETED,
            );
            const overdue = matching.filter(
              (schedule) =>
                scheduleStatusMap.get(schedule.id) ===
                MaintenanceStatus.OVERDUE,
            );
            const dueWithin7DaysCount = matching.filter(isDueWithin7Days).length;
            const dates = matching.map((schedule) => schedule.createdAt);
            const openDueDates = matching
              .filter((schedule) => {
                const status = scheduleStatusMap.get(schedule.id)!;
                return (
                  status !== MaintenanceStatus.COMPLETED &&
                  status !== MaintenanceStatus.CANCELLED
                );
              })
              .map((schedule) => schedule.startReferenceDate)
              .filter((date): date is Date => date !== null)
              .sort((left, right) => left.getTime() - right.getTime());
            const riskLevel: VehicleMaintenanceKpiRow['riskLevel'] =
              overdue.length
                ? 'HIGH'
                : active.length || dueWithin7DaysCount || vehicle.status !== 'AVAILABLE'
                  ? 'MEDIUM'
                  : 'LOW';

            return {
              vehicleId: vehicle.id,
              plateNumber: vehicle.plateNumber,
              vehicleModel: vehicle.model,
              vehicleStatus: vehicle.status,
              currentOdometer: vehicle.odometer,
              totalSchedules: matching.length,
              activeSchedules: active.length,
              completedSchedules: completed.length,
              overdueSchedules: overdue.length,
              dueWithin7Days: dueWithin7DaysCount,
              maintenanceCost: round(
                matching.reduce(
                  (total, schedule) =>
                    total + (scheduleCost.get(schedule.id) ?? 0),
                  0,
                ),
              ),
              completionRate: matching.length
                ? round((completed.length / matching.length) * 100)
                : 0,
              latestMaintenanceDate: dates.length
                ? new Date(Math.max(...dates.map((date) => date.getTime())))
                : null,
              nextDueDate: openDueDates[0] ?? null,
              riskLevel,
            };
          },
        );

        const alerts: MaintenanceAlertRow[] = schedules.flatMap(
          (schedule): MaintenanceAlertRow[] => {
            const status = scheduleStatusMap.get(schedule.id)!;
            const dueDate = schedule.startReferenceDate;
            if (status === MaintenanceStatus.OVERDUE) {
              return [
                {
                  alertId: `OVERDUE:${schedule.id}`,
                  scheduleId: schedule.id,
                  vehiclePlate:
                    vehicleById.get(schedule.vehicleId)?.plateNumber ??
                    schedule.vehicleId,
                  severity: 'HIGH' as const,
                  alertType: 'OVERDUE_MAINTENANCE' as const,
                  maintenanceTitle: schedule.title,
                  message: `${schedule.title} is overdue for vehicle ${vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId}.`,
                  recommendedAction:
                    'Prioritize and assign this maintenance work immediately.',
                  dueDate,
                  generatedAt,
                },
              ];
            }
            if (isDueWithin7Days(schedule) && dueDate) {
              return [
                {
                  alertId: `DUE_SOON:${schedule.id}`,
                  scheduleId: schedule.id,
                  vehiclePlate:
                    vehicleById.get(schedule.vehicleId)?.plateNumber ??
                    schedule.vehicleId,
                  severity: 'MEDIUM' as const,
                  alertType: 'DUE_SOON' as const,
                  maintenanceTitle: schedule.title,
                  message: `${schedule.title} is due within seven days for vehicle ${vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId}.`,
                  recommendedAction:
                    'Confirm mechanic availability and maintenance resources.',
                  dueDate,
                  generatedAt,
                },
              ];
            }
            return [];
          },
        );

        const activeVehicleCount = vehicleKpis.filter(
          (vehicle) => vehicle.activeSchedules > 0,
        ).length;
        const completedSchedulesCount =
          statusCounts.get(MaintenanceStatus.COMPLETED) ?? 0;
        const sourceUpdatedDates = [
          ...vehicles.map((vehicle) => vehicle.updatedAt),
          ...schedules.map((schedule) => schedule.updatedAt),
        ];

        const totalCostSum = Array.from(scheduleCost.values()).reduce(
          (total, cost) => total + cost,
          0,
        );

        const preparedAnalytics: PreparedAnalyticsRows = {
          snapshot: {
            snapshotKey: 'current',
            generatedAt,
            sourceMaxUpdatedAt: sourceUpdatedDates.length
              ? new Date(
                  Math.max(
                    ...sourceUpdatedDates.map((date) => date.getTime()),
                  ),
                )
              : null,
            totalVehicles: vehicles.length,
            availableVehicles: vehicles.filter(
              (vehicle) => vehicle.status === 'AVAILABLE',
            ).length,
            underMaintenanceVehicles: activeVehicleCount,
            underRepairVehicles: vehicles.filter(
              (vehicle) => vehicle.status === 'UNDER_REPAIR',
            ).length,
            totalSchedules: schedules.length,
            pendingSchedules: statusCounts.get(MaintenanceStatus.PENDING) ?? 0,
            dueSchedules: statusCounts.get(MaintenanceStatus.DUE) ?? 0,
            inProgressSchedules:
              statusCounts.get(MaintenanceStatus.IN_PROGRESS) ?? 0,
            completedSchedules: completedSchedulesCount,
            overdueSchedules: statusCounts.get(MaintenanceStatus.OVERDUE) ?? 0,
            cancelledSchedules:
              statusCounts.get(MaintenanceStatus.CANCELLED) ?? 0,
            dueWithin7Days: schedules.filter(isDueWithin7Days).length,
            activeMaintenanceVehicles: activeVehicleCount,
            averageOdometer: vehicles.length
              ? round(
                  vehicles.reduce(
                    (total, vehicle) => total + vehicle.odometer,
                    0,
                  ) / vehicles.length,
                )
              : 0,
            totalMaintenanceCost: round(totalCostSum),
            completionRate: schedules.length
              ? round((completedSchedulesCount / schedules.length) * 100)
              : 0,
            fleetPerformance: vehicles.length
              ? round(
                  ((vehicles.length - activeVehicleCount) / vehicles.length) *
                    100,
                )
              : 0,
          },
          statusSummary,
          monthlyTrends,
          vehicleKpis,
          alerts,
        };

        await replaceVehicleSummary(duckdb, vehicleRows);
        await replaceMaintenanceScheduleSummary(duckdb, scheduleRows);
        await replacePreparedAnalytics(duckdb, preparedAnalytics);

        // Reset cached DuckDB connection in AnalyticsService
        this.analyticsService.resetConnection();

        const durationMs = Date.now() - startTime;
        const msg = `Synced ${vehicles.length} vehicles and ${schedules.length} schedules to DuckDB in ${durationMs}ms.`;
        this.logger.log(msg);
        return { success: true, message: msg };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`PostgreSQL -> DuckDB sync failed: ${errMessage}`, error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
}
