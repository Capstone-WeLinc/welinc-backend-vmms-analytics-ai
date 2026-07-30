import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { DuckDBInstance } from '@duckdb/node-api';

async function main() {
  const databasePath = path.resolve(process.cwd(), 'database', 'vmms_datamart.duckdb');
  await mkdir(path.dirname(databasePath), { recursive: true });

  const instance = await DuckDBInstance.create(databasePath);
  const connection = await instance.connect();

  try {
    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS analytics_snapshot (
        snapshotKey VARCHAR,
        generatedAt TIMESTAMP,
        sourceMaxUpdatedAt TIMESTAMP,
        totalVehicles INTEGER,
        availableVehicles INTEGER,
        underMaintenanceVehicles INTEGER,
        underRepairVehicles INTEGER,
        totalSchedules INTEGER,
        pendingSchedules INTEGER,
        dueSchedules INTEGER,
        inProgressSchedules INTEGER,
        completedSchedules INTEGER,
        overdueSchedules INTEGER,
        cancelledSchedules INTEGER,
        dueWithin7Days INTEGER,
        activeMaintenanceVehicles INTEGER,
        averageOdometer DOUBLE,
        totalMaintenanceCost DOUBLE,
        completionRate DOUBLE,
        fleetPerformance DOUBLE
      );
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS maintenance_status_summary (
        status VARCHAR,
        scheduleCount INTEGER,
        percentage DOUBLE
      );
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS maintenance_monthly_trend (
        monthKey VARCHAR,
        scheduledCount INTEGER,
        completedCount INTEGER,
        activeCount INTEGER,
        overdueCount INTEGER,
        maintenanceCost DOUBLE
      );
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS vehicle_maintenance_kpi (
        vehicleId VARCHAR,
        plateNumber VARCHAR,
        vehicleModel VARCHAR,
        vehicleStatus VARCHAR,
        currentOdometer DOUBLE,
        totalSchedules INTEGER,
        activeSchedules INTEGER,
        completedSchedules INTEGER,
        overdueSchedules INTEGER,
        dueWithin7Days INTEGER,
        maintenanceCost DOUBLE,
        completionRate DOUBLE,
        latestMaintenanceDate TIMESTAMP,
        nextDueDate TIMESTAMP,
        riskLevel VARCHAR
      );
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS maintenance_alerts (
        alertId VARCHAR,
        scheduleId VARCHAR,
        vehiclePlate VARCHAR,
        severity VARCHAR,
        alertType VARCHAR,
        maintenanceTitle VARCHAR,
        message VARCHAR,
        recommendedAction VARCHAR,
        dueDate TIMESTAMP,
        generatedAt TIMESTAMP
      );
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS maintenance_schedule_summary (
        scheduleId VARCHAR,
        vehiclePlate VARCHAR,
        maintenanceTitle VARCHAR,
        triggerType VARCHAR,
        intervalType VARCHAR,
        assignedMechanic VARCHAR,
        scheduleStatus VARCHAR,
        odometerReading DOUBLE,
        nextDueDate TIMESTAMP
      );
    `);

    const snapshotCount = await connection.runAndReadAll(`SELECT COUNT(*) AS rowCount FROM analytics_snapshot;`);
    const rowCount = snapshotCount.getRowObjectsJS()[0]?.rowCount ?? 0;

    if (rowCount === 0) {
      await connection.runAndReadAll(`
        INSERT INTO analytics_snapshot (
          snapshotKey, generatedAt, sourceMaxUpdatedAt, totalVehicles,
          availableVehicles, underMaintenanceVehicles, underRepairVehicles,
          totalSchedules, pendingSchedules, dueSchedules, inProgressSchedules,
          completedSchedules, overdueSchedules, cancelledSchedules,
          dueWithin7Days, activeMaintenanceVehicles, averageOdometer,
          totalMaintenanceCost, completionRate, fleetPerformance
        ) VALUES (
          'current', TIMESTAMP '2026-07-29 10:00:00', TIMESTAMP '2026-07-29 09:45:00',
          12, 5, 2, 1, 18, 4, 3, 2, 7, 1, 1, 3, 4, 24500.5, 185000.0, 72.4, 0.84
        );
      `);

      await connection.runAndReadAll(`
        INSERT INTO maintenance_status_summary (status, scheduleCount, percentage) VALUES
          ('PENDING', 4, 22.2),
          ('DUE', 3, 16.7),
          ('IN_PROGRESS', 2, 11.1),
          ('COMPLETED', 7, 38.9),
          ('OVERDUE', 1, 5.6),
          ('CANCELLED', 1, 5.6);
      `);

      await connection.runAndReadAll(`
        INSERT INTO maintenance_monthly_trend (
          monthKey, scheduledCount, completedCount, activeCount, overdueCount, maintenanceCost
        ) VALUES
          ('2026-06', 6, 4, 2, 1, 55000),
          ('2026-07', 8, 6, 3, 1, 72000);
      `);

      await connection.runAndReadAll(`
        INSERT INTO vehicle_maintenance_kpi (
          vehicleId, plateNumber, vehicleModel, vehicleStatus, currentOdometer,
          totalSchedules, activeSchedules, completedSchedules, overdueSchedules,
          dueWithin7Days, maintenanceCost, completionRate, latestMaintenanceDate,
          nextDueDate, riskLevel
        ) VALUES
          ('veh-001', 'ABC 1234', 'Isuzu FVZ', 'AVAILABLE', 126500, 5, 2, 3, 0, 1, 18000, 60, TIMESTAMP '2026-07-18 08:00:00', TIMESTAMP '2026-08-01 09:00:00', 'MEDIUM'),
          ('veh-002', 'XYZ 5678', 'Hino 300', 'UNDER_MAINTENANCE', 89420, 3, 3, 0, 1, 2, 26500, 40, TIMESTAMP '2026-07-20 11:30:00', TIMESTAMP '2026-07-30 14:00:00', 'HIGH');
      `);

      await connection.runAndReadAll(`
        INSERT INTO maintenance_alerts (
          alertId, scheduleId, vehiclePlate, severity, alertType, maintenanceTitle,
          message, recommendedAction, dueDate, generatedAt
        ) VALUES
          ('ALERT-001', 'sched-001', 'ABC 1234', 'HIGH', 'OVERDUE', 'Brake inspection', 'Brake inspection is overdue.', 'Assign a mechanic immediately.', TIMESTAMP '2026-07-29 08:00:00', TIMESTAMP '2026-07-29 07:45:00'),
          ('ALERT-002', 'sched-002', 'XYZ 5678', 'MEDIUM', 'UPCOMING', 'Oil change', 'Oil change is due soon.', 'Schedule the service window.', TIMESTAMP '2026-07-31 09:00:00', TIMESTAMP '2026-07-29 07:50:00');
      `);

      await connection.runAndReadAll(`
        INSERT INTO maintenance_schedule_summary (
          scheduleId, vehiclePlate, maintenanceTitle, triggerType, intervalType,
          assignedMechanic, scheduleStatus, odometerReading, nextDueDate
        ) VALUES
          ('sched-001', 'ABC 1234', 'Brake inspection', 'ODOMETER', 'MONTHLY', 'John', 'OVERDUE', 126500, TIMESTAMP '2026-07-29 08:00:00'),
          ('sched-002', 'XYZ 5678', 'Oil change', 'TIME', 'MONTHLY', 'Maria', 'DUE', 89420, TIMESTAMP '2026-07-31 09:00:00');
      `);
    }

    console.log('Analytics migration completed.');
  } finally {
    connection.closeSync();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
