import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { dataMartCount, openDataMart, preparedAnalyticsCount } from './duckdb';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function printResult(label: string, passed: boolean, details: string): void {
  console.log(`${label}: ${passed ? 'PASS' : 'FAIL'} (${details})`);
  if (!passed) process.exitCode = 1;
}

async function scalar(sql: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(sql);
  return Number(result[0]?.count ?? 0);
}

async function main(): Promise<void> {
  const duckdb = await openDataMart();

  try {
    const [
      users,
      mechanics,
      vehicles,
      templates,
      templateItems,
      schedules,
      completedSchedules,
      schedulesWithoutVehicle,
      schedulesWithoutMechanic,
      schedulesWithoutGarage,
      completedWithoutCostSummary,
      duplicatePlates,
      duplicateUserEmails,
      postgresVehicles,
      postgresSchedules,
      duckdbVehicles,
      duckdbSchedules,
      vehicleKpis,
      monthlyTrends,
      analyticsSnapshots,
      alerts,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.mechanic.count({ where: { isActive: true } }),
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.checklistTemplate.count({ where: { deletedAt: null } }),
      prisma.checklistItem.count({ where: { deletedAt: null } }),
      prisma.maintenanceSchedule.count({ where: { deletedAt: null } }),
      prisma.maintenanceSchedule.count({
        where: { deletedAt: null, status: 'COMPLETED' },
      }),
      scalar(`
        SELECT COUNT(*)::bigint AS count
        FROM maintenance_schedules schedule
        LEFT JOIN vehicles vehicle
          ON vehicle.plate_number = schedule."vehicleId"
          AND vehicle.deleted_at IS NULL
        WHERE schedule.deleted_at IS NULL
          AND vehicle.id IS NULL
      `),
      scalar(`
        SELECT COUNT(*)::bigint AS count
        FROM maintenance_schedules schedule
        LEFT JOIN mechanics mechanic
          ON mechanic.name = schedule.assigned_mechanic
          AND mechanic.is_active = true
        WHERE schedule.deleted_at IS NULL
          AND mechanic.id IS NULL
      `),
      scalar(`
        SELECT COUNT(*)::bigint AS count
        FROM maintenance_schedules schedule
        LEFT JOIN garages garage
          ON garage.id::text = schedule.garage_id
          AND garage.deleted_at IS NULL
        WHERE schedule.deleted_at IS NULL
          AND schedule.garage_id IS NOT NULL
          AND garage.id IS NULL
      `),
      scalar(`
        SELECT COUNT(*)::bigint AS count
        FROM maintenance_schedules
        WHERE deleted_at IS NULL
          AND status = 'COMPLETED'
          AND (
            work_order_progress IS NULL
            OR work_order_progress->>'totalCost' IS NULL
          )
      `),
      scalar(`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT plate_number
          FROM vehicles
          WHERE deleted_at IS NULL
          GROUP BY plate_number
          HAVING COUNT(*) > 1
        ) duplicates
      `),
      scalar(`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT email
          FROM users
          WHERE deleted_at IS NULL
          GROUP BY email
          HAVING COUNT(*) > 1
        ) duplicates
      `),
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.maintenanceSchedule.count({ where: { deletedAt: null } }),
      dataMartCount(duckdb, 'vehicle_summary'),
      dataMartCount(duckdb, 'maintenance_schedule_summary'),
      preparedAnalyticsCount(duckdb, 'vehicle_maintenance_kpi'),
      preparedAnalyticsCount(duckdb, 'maintenance_monthly_trend'),
      preparedAnalyticsCount(duckdb, 'analytics_snapshot'),
      preparedAnalyticsCount(duckdb, 'maintenance_alerts'),
    ]);

    console.log('VMMS seed summary');
    console.log(`  Users: ${users}`);
    console.log(`  Mechanics: ${mechanics}`);
    console.log(`  Vehicles: ${vehicles}`);
    console.log(`  Checklist templates: ${templates}`);
    console.log(`  Checklist items: ${templateItems}`);
    console.log(`  Maintenance schedules: ${schedules}`);
    console.log(`  Completed maintenance schedules: ${completedSchedules}`);
    console.log(`  Analytics alerts: ${alerts}`);

    printResult(
      'schedule vehicle links',
      schedulesWithoutVehicle === 0,
      `orphans=${schedulesWithoutVehicle}`,
    );
    printResult(
      'schedule mechanic links',
      schedulesWithoutMechanic === 0,
      `orphans=${schedulesWithoutMechanic}`,
    );
    printResult(
      'schedule garage links',
      schedulesWithoutGarage === 0,
      `orphans=${schedulesWithoutGarage}`,
    );
    printResult(
      'completed schedule cost summaries',
      completedWithoutCostSummary === 0,
      `missing=${completedWithoutCostSummary}`,
    );
    printResult(
      'duplicate vehicle plates',
      duplicatePlates === 0,
      `duplicates=${duplicatePlates}`,
    );
    printResult(
      'duplicate user emails',
      duplicateUserEmails === 0,
      `duplicates=${duplicateUserEmails}`,
    );
    printResult(
      'DuckDB vehicle summary',
      postgresVehicles === duckdbVehicles,
      `PostgreSQL=${postgresVehicles}, DuckDB=${duckdbVehicles}`,
    );
    printResult(
      'DuckDB schedule summary',
      postgresSchedules === duckdbSchedules,
      `PostgreSQL=${postgresSchedules}, DuckDB=${duckdbSchedules}`,
    );
    printResult(
      'DuckDB vehicle KPIs',
      postgresVehicles === vehicleKpis,
      `expected=${postgresVehicles}, DuckDB=${vehicleKpis}`,
    );
    printResult(
      'DuckDB monthly trends',
      monthlyTrends === 6,
      `expected=6, DuckDB=${monthlyTrends}`,
    );
    printResult(
      'DuckDB analytics snapshot',
      analyticsSnapshots === 1,
      `expected=1, DuckDB=${analyticsSnapshots}`,
    );
  } finally {
    duckdb.closeSync();
  }
}

main()
  .catch((error: unknown) => {
    console.error('VMMS seed validation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
