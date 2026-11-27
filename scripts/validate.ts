import 'dotenv/config';
import { PrismaClient, MaintenanceStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  dataMartCount,
  initializeDataMart,
  openDataMart,
  preparedAnalyticsCount,
} from './duckdb';
import { embeddingCount, enablePgvector } from './pgvector';
import { scheduleTotalCost } from '../src/analytics/sync.service';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function report(label: string, passed: boolean, details: string): void {
  console.log(`${label} ${passed ? 'PASS' : 'FAIL'} (${details})`);
  if (!passed) process.exitCode = 1;
}

function sparseVector(axis: number, secondaryAxis?: number): string {
  const values = Array<number>(1536).fill(0);
  values[axis] = 1;
  if (secondaryAxis !== undefined) values[secondaryAxis] = 0.1;
  return `[${values.join(',')}]`;
}

async function validateSearchFixtures(): Promise<void> {
  const { hasVectorExtension } = await enablePgvector(prisma);
  if (!hasVectorExtension) {
    report(
      'semantic_search_fixtures',
      false,
      'pgvector extension is unavailable for the fixed retrieval queries',
    );
    return;
  }

  const queryVectors = [
    sparseVector(0),
    sparseVector(1),
    sparseVector(2),
  ];
  const documentVectors = [
    sparseVector(0),
    sparseVector(0, 1),
    sparseVector(1),
    sparseVector(2),
    `[${Array.from({ length: 1536 }, (_, index) => index === 1 ? -1 : 0).join(',')}]`,
  ];
  const queryRows = queryVectors
    .map((_, index) => `('${['brakes', 'engine', 'tires'][index]}', $${index + 1}::vector)`)
    .join(', ');
  const documentRows = documentVectors
    .map((_, index) => `('${['brake_inspection', 'brake_rotor', 'engine_service', 'tire_inspection', 'transmission_service'][index]}', $${index + queryVectors.length + 1}::vector)`)
    .join(', ');
  const rankedRows = await prisma.$queryRawUnsafe<
    Array<{ queryId: string; documentId: string; position: bigint | number }>
  >(
    `WITH query_vectors(query_id, embedding) AS (VALUES ${queryRows}),
          document_vectors(document_id, embedding) AS (VALUES ${documentRows}),
          ranked AS (
            SELECT query_id, document_id,
                   ROW_NUMBER() OVER (
                     PARTITION BY query_id
                     ORDER BY query_vectors.embedding <=> document_vectors.embedding
                   ) AS position
            FROM query_vectors CROSS JOIN document_vectors
          )
     SELECT query_id AS "queryId", document_id AS "documentId", position
     FROM ranked WHERE position <= 3`,
    ...queryVectors,
    ...documentVectors,
  );
  const expected = new Map([
    ['brakes', 'brake_inspection'],
    ['engine', 'engine_service'],
    ['tires', 'tire_inspection'],
  ]);
  const results = new Map<string, Set<string>>();
  for (const row of rankedRows) {
    const matches = results.get(row.queryId) ?? new Set<string>();
    matches.add(row.documentId);
    results.set(row.queryId, matches);
  }
  const passed = [...expected].filter(([query, document]) =>
    results.get(query)?.has(document),
  ).length;
  report(
    'semantic_search_fixtures',
    passed === expected.size,
    `${passed}/${expected.size} known documents ranked in the top 3`,
  );
}

async function main(): Promise<void> {
  const duckdb = await openDataMart();
  try {
    await initializeDataMart(duckdb);
    const [
      sourceVehicles,
      sourceSchedules,
      duckdbVehicles,
      duckdbSchedules,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.maintenanceSchedule.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          totalCost: true,
          partsCost: true,
          laborCost: true,
          workOrderProgress: true,
        },
      }),
      dataMartCount(duckdb, 'vehicle_summary'),
      dataMartCount(duckdb, 'maintenance_schedule_summary'),
    ]);

    report(
      'vehicle_summary',
      sourceVehicles === duckdbVehicles,
      `PostgreSQL=${sourceVehicles}, DuckDB=${duckdbVehicles}`,
    );
    report(
      'maintenance_schedule_summary',
      sourceSchedules.length === duckdbSchedules,
      `PostgreSQL=${sourceSchedules.length}, DuckDB=${duckdbSchedules}`,
    );

    const [
      snapshotCount,
      vehicleKpiCount,
      monthlyTrendCount,
      statusReader,
      snapshotReader,
      orphanAlertReader,
      alertCount,
    ] = await Promise.all([
      preparedAnalyticsCount(duckdb, 'analytics_snapshot'),
      preparedAnalyticsCount(duckdb, 'vehicle_maintenance_kpi'),
      preparedAnalyticsCount(duckdb, 'maintenance_monthly_trend'),
      duckdb.runAndReadAll(
        'SELECT status, scheduleCount FROM maintenance_status_summary',
      ),
      duckdb.runAndReadAll(
        `SELECT totalVehicles, totalSchedules, totalMaintenanceCost
         FROM analytics_snapshot WHERE snapshotKey = 'current'`,
      ),
      duckdb.runAndReadAll(
        `SELECT COUNT(*) AS count FROM maintenance_alerts alert
         LEFT JOIN maintenance_schedule_summary schedule
           ON schedule.scheduleId = alert.scheduleId
         WHERE schedule.scheduleId IS NULL`,
      ),
      preparedAnalyticsCount(duckdb, 'maintenance_alerts'),
    ]);
    const snapshot = snapshotReader.getRowObjectsJS()[0] as
      | {
          totalVehicles: number;
          totalSchedules: number;
          totalMaintenanceCost: number;
        }
      | undefined;
    const statusRows = statusReader.getRowObjectsJS() as Array<{
      status: string;
      scheduleCount: number;
    }>;
    const orphanAlerts = Number(
      (orphanAlertReader.getRowObjectsJS()[0] as { count: bigint | number })
        .count,
    );
    const sourceStatusCounts = new Map<MaintenanceStatus, number>();
    for (const status of Object.values(
      MaintenanceStatus,
    ) as MaintenanceStatus[]) {
      sourceStatusCounts.set(status, 0);
    }
    for (const schedule of sourceSchedules) {
      sourceStatusCounts.set(
        schedule.status,
        (sourceStatusCounts.get(schedule.status) ?? 0) + 1,
      );
    }
    const martStatusCounts = new Map(
      statusRows.map((row) => [row.status, Number(row.scheduleCount)]),
    );
    const statusesMatch = [
      ...new Set([...sourceStatusCounts.keys(), ...martStatusCounts.keys()]),
    ].every(
      (status) =>
        (sourceStatusCounts.get(status as MaintenanceStatus) ?? 0) ===
        (martStatusCounts.get(status) ?? 0),
    );
    const sourceMaintenanceCost = Math.round(
      sourceSchedules.reduce(
        (total, schedule) =>
          total + Math.round(scheduleTotalCost(schedule) * 100) / 100,
        0,
      ) * 100,
    ) / 100;
    const statusTotal = statusRows.reduce(
      (total, row) => total + Number(row.scheduleCount),
      0,
    );

    report(
      'analytics_snapshot',
      snapshotCount === 1 &&
        Number(snapshot?.totalVehicles) === sourceVehicles &&
        Number(snapshot?.totalSchedules) === sourceSchedules.length &&
        Math.abs(
          Number(snapshot?.totalMaintenanceCost) - sourceMaintenanceCost,
        ) < 0.01,
      `snapshots=${snapshotCount}, vehicles=${snapshot?.totalVehicles ?? 0}, schedules=${snapshot?.totalSchedules ?? 0}, source cost=${sourceMaintenanceCost}, DuckDB cost=${snapshot?.totalMaintenanceCost ?? 0}`,
    );
    report(
      'vehicle_maintenance_kpi',
      vehicleKpiCount === sourceVehicles,
      `expected=${sourceVehicles}, DuckDB=${vehicleKpiCount}`,
    );
    report(
      'maintenance_status_summary',
      statusesMatch && statusTotal === sourceSchedules.length,
      `expected schedules=${sourceSchedules.length}, summarized=${statusTotal}, status counts match=${statusesMatch}`,
    );
    report(
      'maintenance_monthly_trend',
      monthlyTrendCount === 6,
      `expected=6, DuckDB=${monthlyTrendCount}`,
    );
    report(
      'maintenance_alerts',
      orphanAlerts === 0,
      `alerts=${alertCount}, orphaned=${orphanAlerts}`,
    );

    const [templates, indexedRows, actualEmbeddingCount] = await Promise.all([
      prisma.checklistTemplate.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          type: true,
          items: {
            where: { deletedAt: null },
            select: { text: true },
          },
        },
      }),
      prisma.$queryRaw<
        Array<{
          scheduleId: string | null;
          templateId: string | null;
          sourceType: string;
        }>
      >`
        SELECT "scheduleId", "templateId", "sourceType"
        FROM "maintenance_embeddings"
      `,
      embeddingCount(prisma),
    ]);
    const eligibleSources = new Set([
      ...sourceSchedules.map(
        (schedule) => `MAINTENANCE_SCHEDULE:${schedule.id}`,
      ),
      ...templates
        .filter((template) =>
          [template.type, ...template.items.map((item) => item.text)].some(
            (text) => text.trim(),
          ),
        )
        .map((template) => `CHECKLIST_TEMPLATE:${template.id}`),
    ]);
    const indexedSources = indexedRows.map((row) => {
      if (row.sourceType === 'MAINTENANCE_SCHEDULE' && row.scheduleId) {
        return `MAINTENANCE_SCHEDULE:${row.scheduleId}`;
      }
      if (row.sourceType === 'CHECKLIST_TEMPLATE' && row.templateId) {
        return `CHECKLIST_TEMPLATE:${row.templateId}`;
      }
      return `INVALID:${row.sourceType}`;
    });
    const indexedSet = new Set(indexedSources);
    const missing = [...eligibleSources].filter(
      (source) => !indexedSet.has(source),
    ).length;
    const extra = [...indexedSet].filter(
      (source) => !eligibleSources.has(source),
    ).length;
    const duplicates = indexedSources.length - indexedSet.size;
    const coverage = eligibleSources.size
      ? Math.round(
          ((eligibleSources.size - missing) / eligibleSources.size) * 100,
        )
      : actualEmbeddingCount === 0
        ? 100
        : 0;
    report(
      'maintenance_embeddings',
      missing === 0 &&
        extra === 0 &&
        duplicates === 0 &&
        actualEmbeddingCount === indexedRows.length,
      `coverage=${coverage}%, eligible=${eligibleSources.size}, indexed=${actualEmbeddingCount}, missing=${missing}, extra=${extra}, duplicates=${duplicates}`,
    );

    await validateSearchFixtures();
  } finally {
    duckdb.closeSync();
  }
}

main()
  .catch((error: unknown) => {
    console.error('Validation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
