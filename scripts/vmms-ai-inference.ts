import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { openDataMart } from './duckdb';

type VehicleKpiRow = {
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
  riskLevel: string;
};

type Prediction = {
  plateNumber: string;
  vehicleModel: string;
  predictedRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  insight: string;
  recommendedAction: string;
};

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function riskScore(row: VehicleKpiRow): number {
  const overdueWeight = row.overdueSchedules * 35;
  const dueSoonWeight = row.dueWithin7Days * 18;
  const activeWeight = row.activeSchedules * 10;
  const odometerWeight = Math.min(row.currentOdometer / 2500, 45);
  const completionPenalty = Math.max(0, 100 - row.completionRate) * 0.2;
  const unavailablePenalty =
    row.vehicleStatus === 'UNDER_REPAIR'
      ? 25
      : row.vehicleStatus === 'UNDER_MAINTENANCE'
        ? 15
        : 0;

  return Math.round(
    Math.min(
      100,
      overdueWeight +
        dueSoonWeight +
        activeWeight +
        odometerWeight +
        completionPenalty +
        unavailablePenalty,
    ),
  );
}

function label(score: number): Prediction['predictedRisk'] {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function action(row: VehicleKpiRow, predictedRisk: Prediction['predictedRisk']): string {
  if (predictedRisk === 'HIGH') {
    return 'Prioritize bay assignment, inspect overdue work, and hold vehicle from dispatch until cleared.';
  }
  if (predictedRisk === 'MEDIUM') {
    return 'Schedule preventive maintenance within the next service window and monitor odometer movement.';
  }
  return 'Keep vehicle in regular dispatch rotation and continue routine monitoring.';
}

function insight(row: VehicleKpiRow, score: number): string {
  const reasons = [
    row.overdueSchedules ? `${row.overdueSchedules} overdue schedule(s)` : null,
    row.dueWithin7Days ? `${row.dueWithin7Days} due soon` : null,
    row.activeSchedules ? `${row.activeSchedules} active maintenance item(s)` : null,
    row.currentOdometer >= 120000 ? `high odometer (${row.currentOdometer} km)` : null,
    row.vehicleStatus !== 'AVAILABLE' ? `status is ${row.vehicleStatus}` : null,
  ].filter(Boolean);

  return `${row.plateNumber} scored ${score}/100 based on ${
    reasons.length ? reasons.join(', ') : 'normal maintenance indicators'
  }.`;
}

async function loadVehicleKpis(): Promise<VehicleKpiRow[]> {
  const duckdb = await openDataMart();
  try {
    const reader = await duckdb.runAndReadAll(`
      SELECT plateNumber, vehicleModel, vehicleStatus, currentOdometer,
             totalSchedules, activeSchedules, completedSchedules,
             overdueSchedules, dueWithin7Days, maintenanceCost,
             completionRate, riskLevel
      FROM vehicle_maintenance_kpi
      ORDER BY plateNumber
    `);

    return reader.getRowObjectsJS().map((row) => ({
      plateNumber: String(row.plateNumber),
      vehicleModel: String(row.vehicleModel),
      vehicleStatus: String(row.vehicleStatus),
      currentOdometer: Number(row.currentOdometer),
      totalSchedules: Number(row.totalSchedules),
      activeSchedules: Number(row.activeSchedules),
      completedSchedules: Number(row.completedSchedules),
      overdueSchedules: Number(row.overdueSchedules),
      dueWithin7Days: Number(row.dueWithin7Days),
      maintenanceCost: Number(row.maintenanceCost),
      completionRate: Number(row.completionRate),
      riskLevel: String(row.riskLevel),
    }));
  } finally {
    duckdb.closeSync();
  }
}

async function main(): Promise<void> {
  const [rows, sourceCounts] = await Promise.all([
    loadVehicleKpis(),
    prisma.$transaction([
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.maintenanceSchedule.count({ where: { deletedAt: null } }),
      prisma.mechanic.count({ where: { isActive: true } }),
    ]),
  ]);

  const predictions = rows
    .map((row): Prediction => {
      const score = riskScore(row);
      const predictedRisk = label(score);
      return {
        plateNumber: row.plateNumber,
        vehicleModel: row.vehicleModel,
        predictedRisk,
        score,
        insight: insight(row, score),
        recommendedAction: action(row, predictedRisk),
      };
    })
    .sort((left, right) => right.score - left.score);

  const topPredictions = predictions.slice(0, 10);
  console.log('VMMS AI maintenance-risk inference');
  console.log(
    `Source data: ${sourceCounts[0]} vehicles, ${sourceCounts[1]} schedules, ${sourceCounts[2]} mechanics`,
  );
  console.table(
    topPredictions.map((prediction) => ({
      plate: prediction.plateNumber,
      model: prediction.vehicleModel,
      risk: prediction.predictedRisk,
      score: prediction.score,
      action: prediction.recommendedAction,
    })),
  );
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), predictions: topPredictions }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error('VMMS AI inference failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
