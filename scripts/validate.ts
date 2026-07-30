import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  dataMartCount,
  initializeDataMart,
  openDataMart,
  preparedAnalyticsCount,
} from './duckdb';
import { embeddingCount } from './pgvector';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function report(label: string, passed: boolean, details: string): void {
  console.log(`${label} ${passed ? 'PASS' : 'FAIL'} (${details})`);
  if (!passed) process.exitCode = 1;
}

async function main(): Promise<void> {
  const duckdb = await openDataMart();
  try {
    await initializeDataMart(duckdb);
    const [
      postgresVehicles,
      postgresSchedules,
      duckdbVehicles,
      duckdbSchedules,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.maintenanceSchedule.count({ where: { deletedAt: null } }),
      dataMartCount(duckdb, 'vehicle_summary'),
      dataMartCount(duckdb, 'maintenance_schedule_summary'),
    ]);

    report(
      'vehicle_summary',
      postgresVehicles === duckdbVehicles,
      `PostgreSQL=${postgresVehicles}, DuckDB=${duckdbVehicles}`,
    );
    report(
      'maintenance_schedule_summary',
      postgresSchedules === duckdbSchedules,
      `PostgreSQL=${postgresSchedules}, DuckDB=${duckdbSchedules}`,
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
        'SELECT COALESCE(SUM(scheduleCount), 0) AS count FROM maintenance_status_summary',
      ),
      duckdb.runAndReadAll(
        `SELECT totalVehicles, totalSchedules FROM analytics_snapshot
         WHERE snapshotKey = 'current'`,
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
      { totalVehicles: number; totalSchedules: number } | undefined;
    const statusTotal = Number(
      (statusReader.getRowObjectsJS()[0] as { count: bigint | number }).count,
    );
    const orphanAlerts = Number(
      (orphanAlertReader.getRowObjectsJS()[0] as { count: bigint | number })
        .count,
    );

    report(
      'analytics_snapshot',
      snapshotCount === 1 &&
        Number(snapshot?.totalVehicles) === postgresVehicles &&
        Number(snapshot?.totalSchedules) === postgresSchedules,
      `snapshots=${snapshotCount}, vehicles=${snapshot?.totalVehicles ?? 0}, schedules=${snapshot?.totalSchedules ?? 0}`,
    );
    report(
      'vehicle_maintenance_kpi',
      vehicleKpiCount === postgresVehicles,
      `expected=${postgresVehicles}, DuckDB=${vehicleKpiCount}`,
    );
    report(
      'maintenance_status_summary',
      statusTotal === postgresSchedules,
      `expected schedules=${postgresSchedules}, summarized=${statusTotal}`,
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

    const [eligibleSchedules, templates] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where: { deletedAt: null },
        select: { title: true },
      }),
      prisma.checklistTemplate.findMany({
        where: { deletedAt: null },
        select: {
          type: true,
          items: {
            where: { deletedAt: null },
            select: { text: true },
          },
        },
      }),
    ]);
    const expectedEmbeddings =
      eligibleSchedules.filter((schedule) => schedule.title.trim()).length +
      templates.filter((template) =>
        [template.type, ...template.items.map((item) => item.text)].some(
          (text) => text.trim(),
        ),
      ).length;
    const actualEmbeddings = await embeddingCount(prisma);
    report(
      'maintenance_embeddings',
      expectedEmbeddings > 0 && actualEmbeddings === expectedEmbeddings,
      `expected=${expectedEmbeddings}, PostgreSQL=${actualEmbeddings}`,
    );
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
