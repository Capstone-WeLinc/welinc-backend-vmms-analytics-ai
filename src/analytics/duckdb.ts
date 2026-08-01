import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  DuckDBConnection,
  DuckDBInstance,
  DuckDBValue,
} from '@duckdb/node-api';

export const DEFAULT_DUCKDB_PATH = path.resolve(
  process.cwd(),
  'database',
  'vmms_datamart.duckdb',
);

export interface VehicleSummaryRow {
  vehicleId: string;
  plateNumber: string;
  vehicleModel: string;
  vehicleStatus: string;
  currentOdometer: number;
  totalMaintenanceSchedules: number;
  latestMaintenanceDate: Date | null;
}

export interface MaintenanceScheduleSummaryRow {
  scheduleId: string;
  vehiclePlate: string;
  maintenanceTitle: string;
  triggerType: string | null;
  intervalType: string | null;
  assignedMechanic: string;
  scheduleStatus: string;
  odometerReading: number | null;
  nextDueDate: Date | null;
}

export interface AnalyticsSnapshotRow {
  snapshotKey: 'current';
  generatedAt: Date;
  sourceMaxUpdatedAt: Date | null;
  totalVehicles: number;
  availableVehicles: number;
  underMaintenanceVehicles: number;
  underRepairVehicles: number;
  totalSchedules: number;
  pendingSchedules: number;
  dueSchedules: number;
  inProgressSchedules: number;
  completedSchedules: number;
  overdueSchedules: number;
  cancelledSchedules: number;
  dueWithin7Days: number;
  activeMaintenanceVehicles: number;
  averageOdometer: number;
  totalMaintenanceCost: number;
  completionRate: number;
  fleetPerformance: number;
}

export interface MaintenanceStatusSummaryRow {
  status: string;
  scheduleCount: number;
  percentage: number;
}

export interface MaintenanceMonthlyTrendRow {
  monthKey: string;
  scheduledCount: number;
  completedCount: number;
  activeCount: number;
  overdueCount: number;
  maintenanceCost: number;
}

export interface VehicleMaintenanceKpiRow {
  vehicleId: string;
  plateNumber: string;
  vehicleModel: string;
  vehicleStatus: string;
  currentOdometer: number;
  totalSchedules: number;
  activeSchedules: number;
  completedSchedules: number;
  overdueSchedules: number;
  dueWithin7Days: number;
  maintenanceCost: number;
  completionRate: number;
  latestMaintenanceDate: Date | null;
  nextDueDate: Date | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MaintenanceAlertRow {
  alertId: string;
  scheduleId: string;
  vehiclePlate: string;
  severity: 'MEDIUM' | 'HIGH';
  alertType: 'DUE_SOON' | 'OVERDUE_MAINTENANCE';
  maintenanceTitle: string;
  message: string;
  recommendedAction: string;
  dueDate: Date | null;
  generatedAt: Date;
}

export interface PreparedAnalyticsRows {
  snapshot: AnalyticsSnapshotRow;
  statusSummary: readonly MaintenanceStatusSummaryRow[];
  monthlyTrends: readonly MaintenanceMonthlyTrendRow[];
  vehicleKpis: readonly VehicleMaintenanceKpiRow[];
  alerts: readonly MaintenanceAlertRow[];
}

export async function openDataMart(): Promise<DuckDBConnection> {
  const databasePath = path.resolve(
    process.env['DUCKDB_PATH'] ?? DEFAULT_DUCKDB_PATH,
  );
  await mkdir(path.dirname(databasePath), { recursive: true });
  const instance = await DuckDBInstance.create(databasePath);
  return instance.connect();
}

export async function initializeDataMart(
  connection: DuckDBConnection,
): Promise<void> {
  await connection.run(`
    CREATE TABLE IF NOT EXISTS vehicle_summary (
      vehicleId VARCHAR PRIMARY KEY,
      plateNumber VARCHAR NOT NULL,
      vehicleModel VARCHAR NOT NULL,
      vehicleStatus VARCHAR NOT NULL,
      currentOdometer INTEGER NOT NULL,
      totalMaintenanceSchedules INTEGER NOT NULL,
      latestMaintenanceDate TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS maintenance_schedule_summary (
      scheduleId VARCHAR PRIMARY KEY,
      vehiclePlate VARCHAR NOT NULL,
      maintenanceTitle VARCHAR NOT NULL,
      triggerType VARCHAR,
      intervalType VARCHAR,
      assignedMechanic VARCHAR NOT NULL,
      scheduleStatus VARCHAR NOT NULL,
      odometerReading INTEGER,
      nextDueDate TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS analytics_snapshot (
      snapshotKey VARCHAR PRIMARY KEY,
      generatedAt TIMESTAMPTZ NOT NULL,
      sourceMaxUpdatedAt TIMESTAMPTZ,
      totalVehicles INTEGER NOT NULL,
      availableVehicles INTEGER NOT NULL,
      underMaintenanceVehicles INTEGER NOT NULL,
      underRepairVehicles INTEGER NOT NULL,
      totalSchedules INTEGER NOT NULL,
      pendingSchedules INTEGER NOT NULL,
      dueSchedules INTEGER NOT NULL,
      inProgressSchedules INTEGER NOT NULL,
      completedSchedules INTEGER NOT NULL,
      overdueSchedules INTEGER NOT NULL,
      cancelledSchedules INTEGER NOT NULL,
      dueWithin7Days INTEGER NOT NULL,
      activeMaintenanceVehicles INTEGER NOT NULL,
      averageOdometer DOUBLE NOT NULL,
      totalMaintenanceCost DOUBLE NOT NULL,
      completionRate DOUBLE NOT NULL,
      fleetPerformance DOUBLE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_status_summary (
      status VARCHAR PRIMARY KEY,
      scheduleCount INTEGER NOT NULL,
      percentage DOUBLE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_monthly_trend (
      monthKey VARCHAR PRIMARY KEY,
      scheduledCount INTEGER NOT NULL,
      completedCount INTEGER NOT NULL,
      activeCount INTEGER NOT NULL,
      overdueCount INTEGER NOT NULL,
      maintenanceCost DOUBLE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_maintenance_kpi (
      vehicleId VARCHAR PRIMARY KEY,
      plateNumber VARCHAR NOT NULL,
      vehicleModel VARCHAR NOT NULL,
      vehicleStatus VARCHAR NOT NULL,
      currentOdometer INTEGER NOT NULL,
      totalSchedules INTEGER NOT NULL,
      activeSchedules INTEGER NOT NULL,
      completedSchedules INTEGER NOT NULL,
      overdueSchedules INTEGER NOT NULL,
      dueWithin7Days INTEGER NOT NULL,
      maintenanceCost DOUBLE NOT NULL,
      completionRate DOUBLE NOT NULL,
      latestMaintenanceDate TIMESTAMPTZ,
      nextDueDate TIMESTAMPTZ,
      riskLevel VARCHAR NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_alerts (
      alertId VARCHAR PRIMARY KEY,
      scheduleId VARCHAR NOT NULL,
      vehiclePlate VARCHAR NOT NULL,
      severity VARCHAR NOT NULL,
      alertType VARCHAR NOT NULL,
      maintenanceTitle VARCHAR NOT NULL,
      message VARCHAR NOT NULL,
      recommendedAction VARCHAR NOT NULL,
      dueDate TIMESTAMPTZ,
      generatedAt TIMESTAMPTZ NOT NULL
    );
  `);
}

function placeholders(
  rowCount: number,
  columnCount: number,
  timestampIndexes: ReadonlySet<number>,
): string {
  let parameter = 1;
  return Array.from({ length: rowCount }, () => {
    const row = Array.from({ length: columnCount }, (_, columnIndex) => {
      const token = `$${parameter++}`;
      return timestampIndexes.has(columnIndex)
        ? `CAST(${token} AS TIMESTAMPTZ)`
        : token;
    });
    return `(${row.join(', ')})`;
  }).join(', ');
}

async function insertBatches<T>(
  connection: DuckDBConnection,
  table: string,
  columns: readonly string[],
  rows: readonly T[],
  valuesFor: (row: T) => DuckDBValue[],
  timestampIndexes: ReadonlySet<number>,
  batchSize = 500,
): Promise<void> {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = batch.flatMap(valuesFor);
    await connection.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders(batch.length, columns.length, timestampIndexes)}`,
      values,
    );
  }
}

export async function replaceVehicleSummary(
  connection: DuckDBConnection,
  rows: readonly VehicleSummaryRow[],
): Promise<void> {
  await connection.run('DELETE FROM vehicle_summary');
  await insertBatches(
    connection,
    'vehicle_summary',
    [
      'vehicleId',
      'plateNumber',
      'vehicleModel',
      'vehicleStatus',
      'currentOdometer',
      'totalMaintenanceSchedules',
      'latestMaintenanceDate',
    ],
    rows,
    (row) => [
      row.vehicleId,
      row.plateNumber,
      row.vehicleModel,
      row.vehicleStatus,
      row.currentOdometer,
      row.totalMaintenanceSchedules,
      row.latestMaintenanceDate?.toISOString() ?? null,
    ],
    new Set([6]),
  );
}

export async function replaceMaintenanceScheduleSummary(
  connection: DuckDBConnection,
  rows: readonly MaintenanceScheduleSummaryRow[],
): Promise<void> {
  await connection.run('DELETE FROM maintenance_schedule_summary');
  await insertBatches(
    connection,
    'maintenance_schedule_summary',
    [
      'scheduleId',
      'vehiclePlate',
      'maintenanceTitle',
      'triggerType',
      'intervalType',
      'assignedMechanic',
      'scheduleStatus',
      'odometerReading',
      'nextDueDate',
    ],
    rows,
    (row) => [
      row.scheduleId,
      row.vehiclePlate,
      row.maintenanceTitle,
      row.triggerType,
      row.intervalType,
      row.assignedMechanic,
      row.scheduleStatus,
      row.odometerReading,
      row.nextDueDate?.toISOString() ?? null,
    ],
    new Set([8]),
  );
}

export async function replacePreparedAnalytics(
  connection: DuckDBConnection,
  rows: PreparedAnalyticsRows,
): Promise<void> {
  await connection.run('DELETE FROM analytics_snapshot');
  await insertBatches(
    connection,
    'analytics_snapshot',
    [
      'snapshotKey',
      'generatedAt',
      'sourceMaxUpdatedAt',
      'totalVehicles',
      'availableVehicles',
      'underMaintenanceVehicles',
      'underRepairVehicles',
      'totalSchedules',
      'pendingSchedules',
      'dueSchedules',
      'inProgressSchedules',
      'completedSchedules',
      'overdueSchedules',
      'cancelledSchedules',
      'dueWithin7Days',
      'activeMaintenanceVehicles',
      'averageOdometer',
      'totalMaintenanceCost',
      'completionRate',
      'fleetPerformance',
    ],
    [rows.snapshot],
    (row) => [
      row.snapshotKey,
      row.generatedAt.toISOString(),
      row.sourceMaxUpdatedAt?.toISOString() ?? null,
      row.totalVehicles,
      row.availableVehicles,
      row.underMaintenanceVehicles,
      row.underRepairVehicles,
      row.totalSchedules,
      row.pendingSchedules,
      row.dueSchedules,
      row.inProgressSchedules,
      row.completedSchedules,
      row.overdueSchedules,
      row.cancelledSchedules,
      row.dueWithin7Days,
      row.activeMaintenanceVehicles,
      row.averageOdometer,
      row.totalMaintenanceCost,
      row.completionRate,
      row.fleetPerformance,
    ],
    new Set([1, 2]),
  );

  await connection.run('DELETE FROM maintenance_status_summary');
  await insertBatches(
    connection,
    'maintenance_status_summary',
    ['status', 'scheduleCount', 'percentage'],
    rows.statusSummary,
    (row) => [row.status, row.scheduleCount, row.percentage],
    new Set(),
  );

  await connection.run('DELETE FROM maintenance_monthly_trend');
  await insertBatches(
    connection,
    'maintenance_monthly_trend',
    [
      'monthKey',
      'scheduledCount',
      'completedCount',
      'activeCount',
      'overdueCount',
      'maintenanceCost',
    ],
    rows.monthlyTrends,
    (row) => [
      row.monthKey,
      row.scheduledCount,
      row.completedCount,
      row.activeCount,
      row.overdueCount,
      row.maintenanceCost,
    ],
    new Set(),
  );

  await connection.run('DELETE FROM vehicle_maintenance_kpi');
  await insertBatches(
    connection,
    'vehicle_maintenance_kpi',
    [
      'vehicleId',
      'plateNumber',
      'vehicleModel',
      'vehicleStatus',
      'currentOdometer',
      'totalSchedules',
      'activeSchedules',
      'completedSchedules',
      'overdueSchedules',
      'dueWithin7Days',
      'maintenanceCost',
      'completionRate',
      'latestMaintenanceDate',
      'nextDueDate',
      'riskLevel',
    ],
    rows.vehicleKpis,
    (row) => [
      row.vehicleId,
      row.plateNumber,
      row.vehicleModel,
      row.vehicleStatus,
      row.currentOdometer,
      row.totalSchedules,
      row.activeSchedules,
      row.completedSchedules,
      row.overdueSchedules,
      row.dueWithin7Days,
      row.maintenanceCost,
      row.completionRate,
      row.latestMaintenanceDate?.toISOString() ?? null,
      row.nextDueDate?.toISOString() ?? null,
      row.riskLevel,
    ],
    new Set([12, 13]),
  );

  await connection.run('DELETE FROM maintenance_alerts');
  await insertBatches(
    connection,
    'maintenance_alerts',
    [
      'alertId',
      'scheduleId',
      'vehiclePlate',
      'severity',
      'alertType',
      'maintenanceTitle',
      'message',
      'recommendedAction',
      'dueDate',
      'generatedAt',
    ],
    rows.alerts,
    (row) => [
      row.alertId,
      row.scheduleId,
      row.vehiclePlate,
      row.severity,
      row.alertType,
      row.maintenanceTitle,
      row.message,
      row.recommendedAction,
      row.dueDate?.toISOString() ?? null,
      row.generatedAt.toISOString(),
    ],
    new Set([8, 9]),
  );
}

export async function dataMartCount(
  connection: DuckDBConnection,
  table: 'vehicle_summary' | 'maintenance_schedule_summary',
): Promise<number> {
  const reader = await connection.runAndReadAll(
    `SELECT COUNT(*) AS count FROM ${table}`,
  );
  const row = reader.getRowObjectsJS()[0] as { count: bigint | number };
  return Number(row.count);
}

export async function preparedAnalyticsCount(
  connection: DuckDBConnection,
  table:
    | 'analytics_snapshot'
    | 'maintenance_status_summary'
    | 'maintenance_monthly_trend'
    | 'vehicle_maintenance_kpi'
    | 'maintenance_alerts',
): Promise<number> {
  const reader = await connection.runAndReadAll(
    `SELECT COUNT(*) AS count FROM ${table}`,
  );
  const row = reader.getRowObjectsJS()[0] as { count: bigint | number };
  return Number(row.count);
}
