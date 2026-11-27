import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MaintenanceStatus, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  initializeDataMart,
  MaintenanceAlertRow,
  MaintenanceMonthlyTrendRow,
  MaintenanceScheduleSummaryRow,
  openDataMart,
  PreparedAnalyticsRows,
  replacePreparedAnalytics,
  replaceMaintenanceScheduleSummary,
  replaceVehicleSummary,
  VehicleMaintenanceKpiRow,
  VehicleSummaryRow,
  createAnalyticsSourceRevision,
} from './duckdb';
import {
  EmbeddingSource,
  enablePgvector,
  generateEmbeddings,
  replaceEmbeddings,
  SOURCE_TYPES,
} from './pgvector';

const dbPoolMax = Number.isSafeInteger(Number(process.env['DB_POOL_MAX'])) && Number(process.env['DB_POOL_MAX']) > 0 ? Number(process.env['DB_POOL_MAX']) : 2;
const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'], max: dbPoolMax });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const STATUS_ORDER = [
  MaintenanceStatus.PENDING,
  MaintenanceStatus.DUE,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.DONE,
  MaintenanceStatus.COMPLETED,
  MaintenanceStatus.OVERDUE,
  MaintenanceStatus.CANCELLED,
] as const;

const ACTIVE_STATUSES = new Set<MaintenanceStatus>([
  MaintenanceStatus.DUE,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.DONE,
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
  partsCost?: unknown;
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
  laborCost?: unknown;
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

function scheduleTotalCost(schedule: {
  totalCost?: unknown;
  partsCost?: unknown;
  laborCost?: unknown;
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

async function applyInfrastructureMigration(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS public.vmms_analytics_schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(1742761042)');
    const migrationId = '0001-hosting-infrastructure';
    const applied = await client.query('SELECT 1 FROM public.vmms_analytics_schema_migrations WHERE id = $1', [migrationId]);
    if (applied.rowCount === 0) {
      const sql = await readFile(join(__dirname, 'migrations', `${migrationId}.sql`), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO public.vmms_analytics_schema_migrations (id) VALUES ($1)', [migrationId]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  await applyInfrastructureMigration();
  const analyticsOnly = process.argv.includes('--analytics-only');
  const duckdb = await openDataMart();
  try {
    await initializeDataMart(duckdb);

    const [vehicles, schedules, templates] = await Promise.all([
      prisma.vehicle.findMany({
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
      prisma.maintenanceSchedule.findMany({
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
      prisma.checklistTemplate.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          type: true,
          items: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
            select: { text: true },
          },
        },
      }),
    ]);

    console.log('Postgres source row counts:', {
      vehicles: vehicles.length,
      schedules: schedules.length,
      checklistTemplates: templates.length,
    });

    const schedulesByPlate = new Map<string, typeof schedules>();
    for (const schedule of schedules) {
      const current = schedulesByPlate.get(schedule.vehicleId) ?? [];
      current.push(schedule);
      schedulesByPlate.set(schedule.vehicleId, current);
    }
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

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
    const scheduleRows: MaintenanceScheduleSummaryRow[] = schedules.map(
      (schedule) => ({
        scheduleId: schedule.id,
        vehiclePlate: vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId,
        maintenanceTitle: schedule.title,
        triggerType: schedule.triggerType,
        intervalType: schedule.intervalType,
        assignedMechanic: schedule.assignedMechanic,
        scheduleStatus: schedule.status,
        odometerReading: schedule.odometerReading,
        nextDueDate: schedule.startReferenceDate,
        partsCost: round(schedulePartsCost(schedule)),
        laborCost: round(scheduleLaborCost(schedule)),
        totalCost: round(scheduleTotalCost(schedule)),
        createdAt: schedule.createdAt,
      }),
    );

    const generatedAt = new Date();
    const dueSoonCutoff = new Date(
      generatedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const scheduleStatus = new Map(
      schedules.map((schedule) => [
        schedule.id,
        analyticsStatus(
          schedule.status,
          schedule.startReferenceDate,
          generatedAt,
        ),
      ]),
    );
    const scheduleCost = new Map(
      schedules.map((schedule) => [
        schedule.id,
        round(scheduleTotalCost(schedule)),
      ]),
    );
    const isDueWithin7Days = (schedule: (typeof schedules)[number]) => {
      const status = scheduleStatus.get(schedule.id)!;
      const dueDate = schedule.startReferenceDate;
      return (
        status !== MaintenanceStatus.DONE &&
        status !== MaintenanceStatus.COMPLETED &&
        status !== MaintenanceStatus.CANCELLED &&
        dueDate !== null &&
        dueDate.getTime() >= generatedAt.getTime() &&
        dueDate.getTime() <= dueSoonCutoff.getTime()
      );
    };

    const statusCounts = new Map<MaintenanceStatus, number>(
      STATUS_ORDER.map((status) => [status, 0]),
    );
    for (const status of scheduleStatus.values()) {
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    }

    const statusSummary = STATUS_ORDER.map((status) => {
      const scheduleCount = statusCounts.get(status) ?? 0;
      return {
        status,
        scheduleCount,
        percentage: schedules.length
          ? round((scheduleCount / schedules.length) * 100)
          : 0,
      };
    });

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
            scheduleStatus.get(schedule.id) === MaintenanceStatus.COMPLETED,
        ).length,
        activeCount: matching.filter((schedule) =>
          ACTIVE_STATUSES.has(scheduleStatus.get(schedule.id)!),
        ).length,
        overdueCount: matching.filter(
          (schedule) =>
            scheduleStatus.get(schedule.id) === MaintenanceStatus.OVERDUE,
        ).length,
        maintenanceCost: round(
          matching.reduce(
            (total, schedule) => total + (scheduleCost.get(schedule.id) ?? 0),
            0,
          ),
        ),
      };
    });

    const schedulesForVehicle = (vehicle: (typeof vehicles)[number]) =>
      [
        ...(schedulesByPlate.get(vehicle.plateNumber) ?? []),
        ...(schedulesByPlate.get(vehicle.id) ?? []),
      ].filter(
        (schedule, index, rows) =>
          rows.findIndex((candidate) => candidate.id === schedule.id) === index,
      );

    const vehicleKpis: VehicleMaintenanceKpiRow[] = vehicles.map((vehicle) => {
      const matching = schedulesForVehicle(vehicle);
      const active = matching.filter((schedule) =>
        ACTIVE_STATUSES.has(scheduleStatus.get(schedule.id)!),
      );
      const completed = matching.filter(
        (schedule) =>
          scheduleStatus.get(schedule.id) === MaintenanceStatus.COMPLETED,
      );
      const overdue = matching.filter(
        (schedule) =>
          scheduleStatus.get(schedule.id) === MaintenanceStatus.OVERDUE,
      );
      const dueWithin7Days = matching.filter(isDueWithin7Days).length;
      const dates = matching.map((schedule) => schedule.createdAt);
      const openDueDates = matching
        .filter((schedule) => {
          const status = scheduleStatus.get(schedule.id)!;
          return (
            status !== MaintenanceStatus.DONE &&
            status !== MaintenanceStatus.COMPLETED &&
            status !== MaintenanceStatus.CANCELLED
          );
        })
        .map((schedule) => schedule.startReferenceDate)
        .filter((date): date is Date => date !== null)
        .sort((left, right) => left.getTime() - right.getTime());
      const riskLevel: VehicleMaintenanceKpiRow['riskLevel'] = overdue.length
        ? 'HIGH'
        : active.length || dueWithin7Days || vehicle.status !== 'AVAILABLE'
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
        dueWithin7Days,
        maintenanceCost: round(
          matching.reduce(
            (total, schedule) => total + (scheduleCost.get(schedule.id) ?? 0),
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
    });

    const alerts: MaintenanceAlertRow[] = schedules.flatMap(
      (schedule): MaintenanceAlertRow[] => {
        const status = scheduleStatus.get(schedule.id)!;
        const dueDate = schedule.startReferenceDate;
        if (status === MaintenanceStatus.OVERDUE) {
          return [
            {
              alertId: `OVERDUE:${schedule.id}`,
              scheduleId: schedule.id,
              vehiclePlate: vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId,
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
              vehiclePlate: vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId,
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
    const completedSchedules =
      statusCounts.get(MaintenanceStatus.COMPLETED) ?? 0;
    const sourceUpdatedDates = [
      ...vehicles.map((vehicle) => vehicle.updatedAt),
      ...schedules.map((schedule) => schedule.updatedAt),
    ];
    const sourceRevision = createAnalyticsSourceRevision(
      vehicles,
      schedules,
    );
    const preparedAnalytics: PreparedAnalyticsRows = {
      snapshot: {
        snapshotKey: 'current',
        sourceRevision,
        generatedAt,
        sourceMaxUpdatedAt: sourceUpdatedDates.length
          ? new Date(
              Math.max(...sourceUpdatedDates.map((date) => date.getTime())),
            )
          : null,
        totalVehicles: vehicles.length,
        availableVehicles: vehicles.filter(
          (vehicle) => vehicle.status === 'AVAILABLE',
        ).length,
        underMaintenanceVehicles: vehicles.filter(
          (vehicle) => vehicle.status === 'UNDER_MAINTENANCE',
        ).length,
        underRepairVehicles: vehicles.filter(
          (vehicle) => vehicle.status === 'UNDER_REPAIR',
        ).length,
        totalSchedules: schedules.length,
        pendingSchedules: statusCounts.get(MaintenanceStatus.PENDING) ?? 0,
        dueSchedules: statusCounts.get(MaintenanceStatus.DUE) ?? 0,
        inProgressSchedules:
          statusCounts.get(MaintenanceStatus.IN_PROGRESS) ?? 0,
        completedSchedules,
        overdueSchedules: statusCounts.get(MaintenanceStatus.OVERDUE) ?? 0,
        cancelledSchedules: statusCounts.get(MaintenanceStatus.CANCELLED) ?? 0,
        dueWithin7Days: schedules.filter(isDueWithin7Days).length,
        activeMaintenanceVehicles: activeVehicleCount,
        averageOdometer: vehicles.length
          ? round(
              vehicles.reduce((total, vehicle) => total + vehicle.odometer, 0) /
                vehicles.length,
            )
          : 0,
        totalMaintenanceCost: round(
          [...scheduleCost.values()].reduce((total, cost) => total + cost, 0),
        ),
        completionRate: schedules.length
          ? round((completedSchedules / schedules.length) * 100)
          : 0,
        fleetPerformance: vehicles.length
          ? round(
              ((vehicles.length - activeVehicleCount) / vehicles.length) * 100,
            )
          : 0,
      },
      statusSummary,
      monthlyTrends,
      vehicleKpis,
      alerts,
    };

    console.log('Migrating vehicle summary...');
    await duckdb.run('BEGIN TRANSACTION');
    try {
      await replaceVehicleSummary(duckdb, vehicleRows);
      console.log(`Done. ${vehicleRows.length} vehicles migrated.`);

      console.log('Migrating maintenance schedules...');
      await replaceMaintenanceScheduleSummary(duckdb, scheduleRows);
      console.log('Preparing authoritative analytics...');
      await replacePreparedAnalytics(duckdb, preparedAnalytics);
      await duckdb.run('COMMIT');
      console.log(`Done. ${scheduleRows.length} schedules migrated.`);
      console.log(
        `Done. ${vehicleKpis.length} vehicle KPIs, ${monthlyTrends.length} trends, and ${alerts.length} alerts prepared.`,
      );
    } catch (error) {
      await duckdb.run('ROLLBACK');
      throw error;
    }

    if (analyticsOnly) {
      console.log('Analytics Data Mart refresh completed successfully.');
      return;
    }

    console.log('Enabling pgvector / embeddings table...');
    const { hasVectorExtension } = await enablePgvector(prisma);
    const pgvectorEnabled = true;
    if (hasVectorExtension) {
      console.log('Done (native pgvector enabled).');
    } else {
      console.log('Done (pgvector C extension unavailable; using JSONB fallback mode).');
    }

    const skipEmbeddings = process.argv.includes('--skip-embeddings');
    if (skipEmbeddings) {
      console.log('Skipping embedding generation (--skip-embeddings).');
    } else if (pgvectorEnabled && process.env['GEMINI_API_KEY']) {
      const sources: EmbeddingSource[] = [];
      for (const schedule of schedules) {
        const vehicle = vehicleById.get(schedule.vehicleId);
        const content = [
          vehicle?.plateNumber ?? schedule.vehicleId,
          schedule.title.trim(),
          `Trigger: ${schedule.triggerType}`,
          `Interval: ${schedule.intervalType}`,
          schedule.assignedMechanic ? `Mechanic: ${schedule.assignedMechanic}` : null,
          `Status: ${schedule.status}`,
          schedule.startReferenceDate
            ? `Due: ${schedule.startReferenceDate.toISOString()}`
            : null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(' | ');
        if (content) {
          sources.push({
            scheduleId: schedule.id,
            templateId: null,
            sourceType: SOURCE_TYPES.schedule,
            content,
          });
        }
      }
      for (const template of templates) {
        const content = [
          template.type,
          ...template.items.map((item) => item.text),
        ]
          .map((part) => part.trim())
          .filter(Boolean)
          .join('\n');
        if (content) {
          sources.push({
            scheduleId: null,
            templateId: template.id,
            sourceType: SOURCE_TYPES.template,
            content,
          });
        }
      }

      console.log('Generating embeddings...');
      const embeddingBatchSize = positiveInteger(
        process.env['EMBEDDING_BATCH_SIZE'],
        100,
      );
      const embeddings: number[][] = [];
      for (let start = 0; start < sources.length; start += embeddingBatchSize) {
        const batch = sources.slice(start, start + embeddingBatchSize);
        embeddings.push(
          ...(await generateEmbeddings(batch.map((item) => item.content))),
        );
        console.log(
          `  Generated ${Math.min(start + batch.length, sources.length)}/${sources.length}`,
        );
      }
      await replaceEmbeddings(prisma, sources, embeddings);
      console.log(`Done. ${embeddings.length} embeddings stored.`);
    } else if (!process.env['GEMINI_API_KEY']) {
      console.log('Skipping embedding generation because GEMINI_API_KEY is not configured.');
    } else {
      console.log('Skipping embedding generation because pgvector is unavailable.');
    }

    console.log('Migration completed successfully.');
  } finally {
    duckdb.closeSync();
  }
}

main()
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
