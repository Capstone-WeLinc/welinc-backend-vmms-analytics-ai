import { HttpException, HttpStatus, Injectable, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDbDataMartService } from './duckdb-datamart.service';

type DataMartRow = Record<string, unknown>;

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  /** AI insights cache to minimize Gemini API calls (free-tier quota is very limited) */
  private aiInsightsCache: { text: string; timestamp: number } | null = null;
  private readonly AI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  /** Shared in-flight promise — concurrent callers await the same Gemini call */
  private aiInsightsBuildPromise: Promise<string> | null = null;

  constructor(private readonly dataMartService: DuckDbDataMartService) {
    console.log('[AnalyticsDataMart] Starting service');
    console.log('[AnalyticsDataMart] current working directory:', process.cwd());
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'welinc-backend-vmms-analytics-ai',
      mode: 'microservice',
      port: process.env['PORT'] ?? 3001,
    };
  }

  async getOverview() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const [statusBreakdown, monthlyTrend] = await Promise.all([
        this.query(
          connection,
          `SELECT status, scheduleCount, percentage
           FROM maintenance_status_summary
           ORDER BY CASE status
             WHEN 'PENDING' THEN 1 WHEN 'DUE' THEN 2 WHEN 'IN_PROGRESS' THEN 3
             WHEN 'COMPLETED' THEN 4 WHEN 'OVERDUE' THEN 5 WHEN 'CANCELLED' THEN 6
             ELSE 7 END`,
        ),
        this.query(
          connection,
          `SELECT monthKey, scheduledCount, completedCount, activeCount,
                  overdueCount, maintenanceCost
           FROM maintenance_monthly_trend
           ORDER BY monthKey`,
        ),
      ]);

      return {
        dataSource: this.dataSourceMetadata(snapshot),
        snapshot,
        summaryMetrics: this.buildOverviewSummaryMetrics(snapshot),
        statusBreakdown,
        monthlyTrend,
      };
    });
  }

  private buildOverviewSummaryMetrics(snapshot: DataMartRow) {
    const totalSchedules = this.toNumber(snapshot.totalSchedules);
    const totalVehicles = this.toNumber(snapshot.totalVehicles);
    const overdueSchedules = this.toNumber(snapshot.overdueSchedules);
    const dueWithin7Days = this.toNumber(snapshot.dueWithin7Days);
    const pendingSchedules = this.toNumber(snapshot.pendingSchedules);
    const activeMaintenanceVehicles = this.toNumber(snapshot.activeMaintenanceVehicles);
    const totalMaintenanceCost = this.toNumber(snapshot.totalMaintenanceCost);

    return {
      overdueRate: totalSchedules ? Number(((overdueSchedules / totalSchedules) * 100).toFixed(1)) : 0,
      dueSoonRate: totalSchedules ? Number(((dueWithin7Days / totalSchedules) * 100).toFixed(1)) : 0,
      pendingRate: totalSchedules ? Number(((pendingSchedules / totalSchedules) * 100).toFixed(1)) : 0,
      activeFleetRate: totalVehicles ? Number(((activeMaintenanceVehicles / totalVehicles) * 100).toFixed(1)) : 0,
      avgCostPerSchedule: totalSchedules ? Number((totalMaintenanceCost / totalSchedules).toFixed(2)) : 0,
      avgCostPerVehicle: totalVehicles ? Number((totalMaintenanceCost / totalVehicles).toFixed(2)) : 0,
    };
  }

  private calculateRiskScore(vehicle: any): number {
    let score = 0;
    const overdue = this.toNumber(vehicle.overdueSchedules);
    const active = this.toNumber(vehicle.activeSchedules);
    const completion = this.toNumber(vehicle.completionRate);
    
    score += overdue * 35;
    score += active * 10;
    if (completion < 100) {
      score += (100 - completion) * 0.2;
    }
    
    let nextDueDate = String(vehicle.nextDueDate ?? '').trim();
    if (nextDueDate.toLowerCase() === 'null' || nextDueDate.toLowerCase() === 'undefined' || nextDueDate === 'Invalid Date') {
      nextDueDate = '';
    }
    if (!nextDueDate && active > 0) {
      score += 15;
    }
    
    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  private getRiskLevel(score: number): string {
    if (score > 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  async getVehicleKpis() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const vehicles = await this.query(
        connection,
        `SELECT vehicleId, plateNumber, vehicleModel, vehicleStatus,
                currentOdometer, totalSchedules, activeSchedules,
                completedSchedules, overdueSchedules, dueWithin7Days,
                maintenanceCost, completionRate,
                CAST(latestMaintenanceDate AS VARCHAR) AS latestMaintenanceDate,
                CAST(nextDueDate AS VARCHAR) AS nextDueDate, riskLevel
         FROM vehicle_maintenance_kpi
         ORDER BY CASE riskLevel WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                  plateNumber`,
      );

      const vehiclesWithRiskReason = (vehicles || []).map((vehicle: any) => {
        const riskScore = this.calculateRiskScore(vehicle);
        const computedRiskLevel = this.getRiskLevel(riskScore);
        const updatedVehicle = { ...vehicle, riskScore, riskLevel: computedRiskLevel };
        return {
          ...updatedVehicle,
          riskReason: this.buildVehicleRiskReason(updatedVehicle),
        };
      });
      
      // Re-sort by the newly computed risk level
      vehiclesWithRiskReason.sort((a, b) => {
        const levelWeight = (lvl: string) => lvl === 'HIGH' ? 1 : lvl === 'MEDIUM' ? 2 : 3;
        const diff = levelWeight(a.riskLevel) - levelWeight(b.riskLevel);
        if (diff !== 0) return diff;
        return a.plateNumber.localeCompare(b.plateNumber);
      });

      return { dataSource: this.dataSourceMetadata(snapshot), vehicles: vehiclesWithRiskReason };
    });
  }

  private buildVehicleRiskReason(vehicle: any): string {
    const overdueSchedules = this.toNumber(vehicle.overdueSchedules);
    const activeSchedules = this.toNumber(vehicle.activeSchedules);
    const dueWithin7Days = this.toNumber(vehicle.dueWithin7Days);
    const completionRate = this.toNumber(vehicle.completionRate);
    let nextDueDate = String(vehicle.nextDueDate ?? '').trim();
    if (nextDueDate.toLowerCase() === 'null' || nextDueDate.toLowerCase() === 'undefined' || nextDueDate === 'Invalid Date') {
      nextDueDate = '';
    }
    const status = String(vehicle.vehicleStatus ?? '').trim();
    const riskLevel = String(vehicle.riskLevel ?? '').toUpperCase();

    const parts: string[] = [];
    if (overdueSchedules > 0) {
      parts.push(`${overdueSchedules} overdue schedule${overdueSchedules === 1 ? '' : 's'}`);
    }
    if (activeSchedules > 0) {
      parts.push(`${activeSchedules} active schedule${activeSchedules === 1 ? '' : 's'}`);
    }
    if (dueWithin7Days > 0) {
      parts.push(`${dueWithin7Days} due within 7 days`);
    }
    if (status && status !== 'AVAILABLE' && parts.length === 0) {
      parts.push(`status is ${status.toLowerCase()}`);
    }

    let reason = parts.length > 0
      ? `${parts.join(', ')}.`
      : 'No active or upcoming maintenance requirements.';

    if (nextDueDate) {
      reason += ` Next due ${nextDueDate}.`;
    }
    if (!Number.isNaN(completionRate)) {
      reason += ` Completion ${completionRate}%.`;
    }

    if (reason === 'No active or upcoming maintenance requirements.' && riskLevel === 'MEDIUM') {
      reason = `Medium risk; review upcoming work and validate schedule completion. Completion ${completionRate}%${nextDueDate ? `, next due ${nextDueDate}` : ''}.`;
    }
    if (reason === 'No active or upcoming maintenance requirements.' && riskLevel === 'HIGH') {
      reason = `High risk; overdue or urgent maintenance is expected. Completion ${completionRate}%${nextDueDate ? `, next due ${nextDueDate}` : ''}.`;
    }

    return reason;
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  async getAlerts() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const alerts = await this.query(
        connection,
        `SELECT a.alertId, a.scheduleId, a.vehiclePlate, a.severity, a.alertType,
                a.maintenanceTitle, a.message, a.recommendedAction,
                CAST(a.dueDate AS VARCHAR) AS dueDate,
                CAST(a.generatedAt AS VARCHAR) AS generatedAt,
                k.totalSchedules, k.activeSchedules, k.completedSchedules, k.overdueSchedules,
                k.dueWithin7Days, k.completionRate, CAST(k.nextDueDate AS VARCHAR) AS nextDueDate,
                k.vehicleStatus, k.riskLevel as rawRiskLevel
         FROM maintenance_alerts a
         LEFT JOIN vehicle_maintenance_kpi k ON a.vehiclePlate = k.plateNumber
         ORDER BY a.dueDate NULLS LAST, a.vehiclePlate`,
      );
      
      const normalizedAlerts = alerts.map((alert: any) => {
        const vehicleForRisk = {
          overdueSchedules: alert.overdueSchedules ?? 0,
          activeSchedules: alert.activeSchedules ?? 0,
          completionRate: alert.completionRate ?? 100,
          nextDueDate: alert.nextDueDate,
          vehicleStatus: alert.vehicleStatus
        };
        const riskScore = this.calculateRiskScore(vehicleForRisk);
        const computedSeverity = this.getRiskLevel(riskScore);
        
        // Inherit vehicle's overall risk severity, but keep original DB severity if vehicle is LOW but alert is critical
        let severityToUse = computedSeverity;
        if (computedSeverity === 'LOW' && (alert.severity === 'HIGH' || alert.severity === 'MEDIUM')) {
          severityToUse = alert.severity;
        }

        return {
          ...alert,
          severity: severityToUse,
        };
      }).sort((a, b) => {
        const s = (sev: string) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
        return s(a.severity) - s(b.severity);
      });

      return { dataSource: this.dataSourceMetadata(snapshot), alerts: normalizedAlerts };
    });
  }

  async searchMaintenanceSchedules(query: string | undefined, limit = '6') {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const normalizedQuery = String(query ?? '').trim().toLowerCase();
      const max = Math.min(Math.max(Number(limit) || 6, 1), 50);
      const whereClause = normalizedQuery
        ? `WHERE LOWER(vehiclePlate) LIKE '%${normalizedQuery.replace(/'/g, "''")}%' OR LOWER(maintenanceTitle) LIKE '%${normalizedQuery.replace(/'/g, "''")}%' OR LOWER(assignedMechanic) LIKE '%${normalizedQuery.replace(/'/g, "''")}%'`
        : '';
      const schedules = await this.query(
        connection,
        `SELECT scheduleId, vehiclePlate, maintenanceTitle, triggerType,
                intervalType, assignedMechanic, scheduleStatus,
                odometerReading, CAST(nextDueDate AS VARCHAR) AS nextDueDate
         FROM maintenance_schedule_summary
         ${whereClause}
         ORDER BY nextDueDate NULLS LAST, maintenanceTitle
         LIMIT ${max}`,
      );
      return { dataSource: this.dataSourceMetadata(snapshot), schedules };
    });
  }

  async getPredictiveForecast() {
    return this.withDataMart(async (connection) => {
      const forecast = await this.query(
        connection,
        `WITH EnrichedSchedules AS (
          SELECT 
            s.scheduleId,
            s.vehiclePlate,
            s.nextDueDate,
            s.intervalType,
            v.latestMaintenanceDate
          FROM maintenance_schedule_summary s
          LEFT JOIN vehicle_maintenance_kpi v ON s.vehiclePlate = v.plateNumber
          WHERE s.scheduleStatus NOT IN ('COMPLETED', 'CANCELLED')
        ),
        PredictedSchedules AS (
          SELECT 
            *,
            COALESCE(
              nextDueDate,
              CASE 
                WHEN intervalType = 'MONTHLY' AND latestMaintenanceDate IS NOT NULL THEN latestMaintenanceDate + INTERVAL 30 DAY
                WHEN intervalType = 'QUARTERLY' AND latestMaintenanceDate IS NOT NULL THEN latestMaintenanceDate + INTERVAL 90 DAY
                WHEN intervalType = 'YEARLY' AND latestMaintenanceDate IS NOT NULL THEN latestMaintenanceDate + INTERVAL 365 DAY
                ELSE current_date + INTERVAL 30 DAY
              END
            ) as estimatedDueDate
          FROM EnrichedSchedules
        )
        SELECT 
          CAST(COUNT(CASE WHEN estimatedDueDate <= current_date + INTERVAL 7 DAY THEN 1 END) AS INTEGER) as dueIn7Days,
          CAST(COUNT(CASE WHEN estimatedDueDate > current_date + INTERVAL 7 DAY AND estimatedDueDate <= current_date + INTERVAL 30 DAY THEN 1 END) AS INTEGER) as dueIn30Days,
          CAST(COUNT(CASE WHEN estimatedDueDate > current_date + INTERVAL 30 DAY AND estimatedDueDate <= current_date + INTERVAL 90 DAY THEN 1 END) AS INTEGER) as dueIn90Days
        FROM PredictedSchedules`
      );
      return forecast[0];
    });
  }

  async getAnomalies() {
    return this.withDataMart(async (connection) => {
      const repeatedFailures = await this.query(
        connection,
        `SELECT vehiclePlate, maintenanceTitle, CAST(COUNT(*) AS INTEGER) as incidentCount
         FROM maintenance_schedule_summary 
         GROUP BY vehiclePlate, maintenanceTitle 
         HAVING COUNT(*) >= 2
         ORDER BY incidentCount DESC`
      );
      
      const missingDates = await this.query(
        connection,
        `SELECT vehiclePlate, maintenanceTitle, scheduleId
         FROM maintenance_schedule_summary
         WHERE nextDueDate IS NULL AND scheduleStatus != 'COMPLETED'`
      );

      return { repeatedFailures, missingDates };
    });
  }

  async getExpandedTrends() {
    return this.withDataMart(async (connection) => {
      const topTypes = await this.query(
        connection,
        `SELECT maintenanceTitle, CAST(COUNT(*) AS INTEGER) as count
         FROM maintenance_schedule_summary
         GROUP BY maintenanceTitle
         ORDER BY count DESC
         LIMIT 5`
      );
      return { topTypes };
    });
  }

  // ─── Work Order / Mechanic Analytics ───────────────────────────────────────

  private workOrderAiCache: { text: string; timestamp: number } | null = null;
  private workOrderAiBuildPromise: Promise<string> | null = null;

  async getWorkOrderSummary() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);

      const [statusBreakdown, mechanicWorkload, timeline, topTypes, costBreakdown] = await Promise.all([
        // Status distribution
        this.query(
          connection,
          `SELECT scheduleStatus AS status,
                  CAST(COUNT(*) AS INTEGER) AS workOrderCount,
                  CAST(ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS DOUBLE) AS percentage,
                  CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost
           FROM maintenance_schedule_summary
           GROUP BY scheduleStatus
           ORDER BY CASE scheduleStatus
             WHEN 'PENDING' THEN 1 WHEN 'DUE' THEN 2 WHEN 'IN_PROGRESS' THEN 3
             WHEN 'COMPLETED' THEN 4 WHEN 'OVERDUE' THEN 5 WHEN 'CANCELLED' THEN 6
             ELSE 7 END`,
        ),
        // Mechanic workload with cost
        this.getMechanicWorkload(),
        // Monthly timeline
        this.getWorkOrderTimeline(),
        // Top maintenance types by frequency
        this.query(
          connection,
          `SELECT maintenanceTitle AS type,
                  CAST(COUNT(*) AS INTEGER) AS count,
                  CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
                  CAST(ROUND(AVG(totalCost), 2) AS DOUBLE) AS avgCost
           FROM maintenance_schedule_summary
           GROUP BY maintenanceTitle
           ORDER BY count DESC
           LIMIT 8`,
        ),
        // Overall cost breakdown
        this.query(
          connection,
          `SELECT
             CAST(ROUND(SUM(partsCost), 2) AS DOUBLE) AS totalPartsCost,
             CAST(ROUND(SUM(laborCost), 2) AS DOUBLE) AS totalLaborCost,
             CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
             CAST(ROUND(AVG(CASE WHEN totalCost > 0 THEN totalCost END), 2) AS DOUBLE) AS avgCostPerWorkOrder,
             CAST(COUNT(CASE WHEN totalCost > 0 THEN 1 END) AS INTEGER) AS workOrdersWithCost
           FROM maintenance_schedule_summary`,
        ),
      ]);

      const totals = (statusBreakdown as any[]).reduce(
        (acc: Record<string, number>, row: any) => {
          acc[String(row.status)] = this.toNumber(row.workOrderCount);
          return acc;
        },
        {},
      );

      const costs = (costBreakdown as any[])[0] ?? {};

      return {
        dataSource: this.dataSourceMetadata(snapshot),
        summary: {
          totalWorkOrders: Object.values(totals).reduce((s: number, v) => s + (v as number), 0),
          openWorkOrders: (totals['PENDING'] ?? 0) + (totals['DUE'] ?? 0),
          inProgressWorkOrders: totals['IN_PROGRESS'] ?? 0,
          overdueWorkOrders: totals['OVERDUE'] ?? 0,
          completedWorkOrders: totals['COMPLETED'] ?? 0,
          cancelledWorkOrders: totals['CANCELLED'] ?? 0,
          totalPartsCost: this.toNumber(costs.totalPartsCost),
          totalLaborCost: this.toNumber(costs.totalLaborCost),
          totalCost: this.toNumber(costs.totalCost),
          avgCostPerWorkOrder: this.toNumber(costs.avgCostPerWorkOrder),
          workOrdersWithCost: this.toNumber(costs.workOrdersWithCost),
        },
        statusBreakdown,
        mechanicWorkload,
        timeline,
        topMaintenanceTypes: topTypes,
      };
    });
  }

  async getMechanicWorkload() {
    return this.withDataMart(async (connection) => {
      const rows = await this.query(
        connection,
        `SELECT
           COALESCE(NULLIF(TRIM(assignedMechanic), ''), 'Unassigned') AS mechanic,
           CAST(COUNT(*) AS INTEGER) AS totalAssigned,
           CAST(SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN 1 ELSE 0 END) AS INTEGER) AS completed,
           CAST(SUM(CASE WHEN scheduleStatus = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS INTEGER) AS inProgress,
           CAST(SUM(CASE WHEN scheduleStatus = 'OVERDUE' THEN 1 ELSE 0 END) AS INTEGER) AS overdue,
           CAST(SUM(CASE WHEN scheduleStatus IN ('PENDING', 'DUE') THEN 1 ELSE 0 END) AS INTEGER) AS pending,
           CAST(ROUND(
             SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN 1 ELSE 0 END) * 100.0 /
             NULLIF(COUNT(*), 0), 1
           ) AS DOUBLE) AS completionRate,
           CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
           CAST(ROUND(SUM(partsCost), 2) AS DOUBLE) AS totalPartsCost,
           CAST(ROUND(SUM(laborCost), 2) AS DOUBLE) AS totalLaborCost,
           CAST(ROUND(AVG(CASE WHEN totalCost > 0 THEN totalCost END), 2) AS DOUBLE) AS avgCostPerWorkOrder,
           CAST(COUNT(CASE WHEN scheduleStatus = 'OVERDUE' AND nextDueDate IS NOT NULL
                          AND nextDueDate < current_date - INTERVAL 30 DAY THEN 1 END) AS INTEGER) AS overdueOver30Days
         FROM maintenance_schedule_summary
         GROUP BY COALESCE(NULLIF(TRIM(assignedMechanic), ''), 'Unassigned')
         ORDER BY overdue DESC, totalAssigned DESC`,
      );

      return (rows as any[]).map((row) => ({
        ...row,
        riskLevel: this.toNumber(row.overdue) > 0
          ? 'HIGH'
          : this.toNumber(row.inProgress) > 0 || this.toNumber(row.pending) > 0
            ? 'MEDIUM'
            : 'LOW',
      }));
    });
  }

  async getWorkOrderTimeline() {
    return this.withDataMart(async (connection) => {
      const rows = await this.query(
        connection,
        `SELECT
           strftime(createdAt, '%Y-%m') AS monthKey,
           CAST(COUNT(*) AS INTEGER) AS created,
           CAST(SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN 1 ELSE 0 END) AS INTEGER) AS completed,
           CAST(SUM(CASE WHEN scheduleStatus = 'OVERDUE' THEN 1 ELSE 0 END) AS INTEGER) AS overdue,
           CAST(SUM(CASE WHEN scheduleStatus = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS INTEGER) AS active,
           CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
           CAST(ROUND(SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN totalCost ELSE 0 END), 2) AS DOUBLE) AS completedCost
         FROM maintenance_schedule_summary
         WHERE createdAt IS NOT NULL
         GROUP BY strftime(createdAt, '%Y-%m')
         ORDER BY monthKey
         LIMIT 12`,
      );
      return rows;
    });
  }

  async getScheduleWorkOrders(mechanic?: string, status?: string, limit = '100') {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const conditions: string[] = [];
      if (mechanic?.trim()) {
        const escaped = mechanic.trim().replace(/'/g, "''");
        conditions.push(`LOWER(assignedMechanic) LIKE '%${escaped.toLowerCase()}%'`);
      }
      if (status?.trim()) {
        const escaped = status.trim().replace(/'/g, "''");
        conditions.push(`scheduleStatus = '${escaped.toUpperCase()}'`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const max = Math.min(Math.max(Number(limit) || 100, 1), 500);

      const rows = await this.query(
        connection,
        `SELECT
           scheduleId,
           vehiclePlate,
           maintenanceTitle,
           triggerType,
           intervalType,
           assignedMechanic AS mechanic,
           scheduleStatus AS status,
           odometerReading,
           CAST(nextDueDate AS VARCHAR) AS nextDueDate,
           CAST(createdAt AS VARCHAR) AS createdAt,
           CAST(partsCost AS DOUBLE) AS partsCost,
           CAST(laborCost AS DOUBLE) AS laborCost,
           CAST(totalCost AS DOUBLE) AS totalCost
         FROM maintenance_schedule_summary
         ${where}
         ORDER BY CASE scheduleStatus WHEN 'OVERDUE' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'DUE' THEN 3 WHEN 'PENDING' THEN 4 ELSE 5 END, nextDueDate NULLS LAST
         LIMIT ${max}`,
      );

      const now = Date.now();
      const workOrders = rows.map((r: any) => {
        const createdTime = r.createdAt ? Date.parse(r.createdAt) : now;
        const dueTime = r.nextDueDate ? Date.parse(r.nextDueDate) : null;
        const daysOpen = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
        const daysOverdue = dueTime && now > dueTime && r.status !== 'COMPLETED'
          ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24))
          : 0;

        const priority =
          r.status === 'OVERDUE' || daysOverdue > 0
            ? 'HIGH'
            : (r.odometerReading ?? 0) > 100000 || r.triggerType === 'ODOMETER'
              ? 'MEDIUM'
              : 'NORMAL';

        const statusLabel =
          r.status === 'COMPLETED'
            ? 'Completed'
            : r.status === 'IN_PROGRESS'
              ? 'In Progress'
              : r.status === 'OVERDUE'
                ? 'Overdue'
                : r.status === 'DUE'
                  ? 'Due Soon'
                  : r.status === 'CANCELLED'
                    ? 'Cancelled'
                    : 'Pending';

        return {
          ...r,
          daysOpen,
          daysOverdue,
          priority,
          statusLabel,
          partsCost: this.toNumber(r.partsCost),
          laborCost: this.toNumber(r.laborCost),
          totalCost: this.toNumber(r.totalCost),
        };
      });

      return {
        dataSource: this.dataSourceMetadata(snapshot),
        workOrders,
      };
    });
  }

  async getWorkOrderById(id: string) {
    return this.withDataMart(async (connection) => {
      const escaped = id.trim().replace(/'/g, "''");
      const rows = await this.query(
        connection,
        `SELECT
           scheduleId,
           vehiclePlate,
           maintenanceTitle,
           triggerType,
           intervalType,
           assignedMechanic AS mechanic,
           scheduleStatus AS status,
           odometerReading,
           CAST(nextDueDate AS VARCHAR) AS nextDueDate,
           CAST(createdAt AS VARCHAR) AS createdAt,
           CAST(partsCost AS DOUBLE) AS partsCost,
           CAST(laborCost AS DOUBLE) AS laborCost,
           CAST(totalCost AS DOUBLE) AS totalCost
         FROM maintenance_schedule_summary
         WHERE scheduleId = '${escaped}'`,
      );

      if (!rows[0]) {
        throw new NotFoundException(`Work order schedule with ID ${id} not found.`);
      }

      const r = rows[0] as any;
      const now = Date.now();
      const createdTime = r.createdAt ? Date.parse(r.createdAt) : now;
      const dueTime = r.nextDueDate ? Date.parse(r.nextDueDate) : null;
      const daysOpen = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
      const daysOverdue = dueTime && now > dueTime && r.status !== 'COMPLETED'
        ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24))
        : 0;

      const priority =
        r.status === 'OVERDUE' || daysOverdue > 0
          ? 'HIGH'
          : (r.odometerReading ?? 0) > 100000 || r.triggerType === 'ODOMETER'
            ? 'MEDIUM'
            : 'NORMAL';

      const statusLabel =
        r.status === 'COMPLETED'
          ? 'Completed'
          : r.status === 'IN_PROGRESS'
            ? 'In Progress'
            : r.status === 'OVERDUE'
              ? 'Overdue'
              : r.status === 'DUE'
                ? 'Due Soon'
                : r.status === 'CANCELLED'
                  ? 'Cancelled'
                  : 'Pending';

      return {
        workOrder: {
          ...r,
          daysOpen,
          daysOverdue,
          priority,
          statusLabel,
          partsCost: this.toNumber(r.partsCost),
          laborCost: this.toNumber(r.laborCost),
          totalCost: this.toNumber(r.totalCost),
        },
      };
    });
  }

  async getWorkOrderRecommendations(id: string, customTitle?: string, customVehicle?: string) {
    let title = customTitle || 'Maintenance Work Order';
    let vehiclePlate = customVehicle || 'Vehicle';
    let workOrderData: any = null;

    try {
      const res = await this.getWorkOrderById(id);
      workOrderData = res.workOrder;
      title = workOrderData.maintenanceTitle || title;
      vehiclePlate = workOrderData.vehiclePlate || vehiclePlate;
    } catch {
      // Allow standalone recommendations if scheduleId is virtual or missing
    }

    const steps = this.getDefaultChecklistSteps(title);

    const prompt = `You are a certified master fleet mechanic and technical service advisor. Generate step-by-step technical advice and tools/parts recommendations for the following work order:

Vehicle: ${vehiclePlate}
Maintenance Task: ${title}
${workOrderData ? `Status: ${workOrderData.statusLabel} | Priority: ${workOrderData.priority} | Odometer: ${workOrderData.odometerReading ?? 'n/a'} km` : ''}

Provide clear, concise guidance in 4 sections:
1. Critical Safety & PPE Requirements
2. Recommended Diagnostic Tools & Parts Needed
3. Step-by-Step Technical Execution Advisory
4. Post-Service Verification & Quality Check`;

    let aiRecommendations = '';
    try {
      aiRecommendations = await this.generateGeminiText(prompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      aiRecommendations = `Technical Advisory for ${title} (${vehiclePlate}):\n- Perform standard pre-service safety isolation.\n- Refer to VMMS OEM manual for torque specs and fluid capacities.\n- Verify leak-free operation prior to sign-off.\n\n(AI advisory fallback: ${msg})`;
    }

    return {
      scheduleId: id,
      title,
      vehiclePlate,
      workOrder: workOrderData,
      checklist: steps,
      aiRecommendations,
    };
  }

  async getScheduleWithAi(id: string) {
    return this.getWorkOrderRecommendations(id);
  }

  async getWorkOrderAiInsights(): Promise<string> {
    const isFresh =
      this.workOrderAiCache &&
      Date.now() - this.workOrderAiCache.timestamp < this.AI_CACHE_TTL_MS;

    if (isFresh) return this.workOrderAiCache!.text;

    if (this.workOrderAiCache) {
      if (!this.workOrderAiBuildPromise) {
        this.workOrderAiBuildPromise = this.buildAndCacheWorkOrderAiInsights().finally(() => {
          this.workOrderAiBuildPromise = null;
        });
      }
      return this.workOrderAiCache.text;
    }

    if (!this.workOrderAiBuildPromise) {
      this.workOrderAiBuildPromise = this.buildAndCacheWorkOrderAiInsights().finally(() => {
        this.workOrderAiBuildPromise = null;
      });
    }
    return this.workOrderAiBuildPromise;
  }

  private async buildAndCacheWorkOrderAiInsights(): Promise<string> {
    const summary = await this.getWorkOrderSummary();

    const s = summary.summary;
    const mechanics: any[] = (summary.mechanicWorkload as any[]) ?? [];
    const topTypes: any[] = (summary.topMaintenanceTypes as any[]) ?? [];
    const timeline: any[] = (summary.timeline as any[]) ?? [];

    const fmt = (n: number) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n}`;

    const topOverdue = mechanics
      .filter((m: any) => this.toNumber(m.overdue) > 0)
      .slice(0, 4)
      .map((m: any) => `${m.mechanic}: ${m.overdue} overdue (${m.overdueOver30Days} >30d), cost ${fmt(this.toNumber(m.totalCost))}, ${m.completionRate}% done`)
      .join('; ');

    const topByLoad = mechanics
      .slice(0, 4)
      .map((m: any) => `${m.mechanic}: ${m.totalAssigned} WOs (${m.inProgress} active, ${m.completed} done), cost ${fmt(this.toNumber(m.totalCost))}`)
      .join('; ');

    const topCostMechanics = [...mechanics]
      .sort((a, b) => this.toNumber(b.totalCost) - this.toNumber(a.totalCost))
      .slice(0, 3)
      .map((m: any) => `${m.mechanic}: ${fmt(this.toNumber(m.totalCost))} (avg ${fmt(this.toNumber(m.avgCostPerWorkOrder))}/WO)`)
      .join('; ');

    const topTypesList = topTypes
      .slice(0, 4)
      .map((t: any) => `${t.type}: ${t.count} WOs, ${fmt(this.toNumber(t.totalCost))} total (avg ${fmt(this.toNumber(t.avgCost))})`)
      .join('; ');

    const latestMonth = timeline.at(-1);
    const trendLine = latestMonth
      ? `${latestMonth.monthKey}: ${latestMonth.created} WOs, ${latestMonth.completed} done, ${latestMonth.overdue} overdue, cost ${fmt(this.toNumber(latestMonth.totalCost))}`
      : '';

    const mechanicCount = mechanics.filter((m: any) => m.mechanic !== 'Unassigned').length;

    const prompt = `You are a senior fleet maintenance analyst. Analyze mechanic work order data for actionable insights. Be specific and data-driven. No preamble.

Work Order Data:
- Total WOs: ${s.totalWorkOrders} (${s.openWorkOrders} open, ${s.inProgressWorkOrders} in-progress, ${s.overdueWorkOrders} OVERDUE, ${s.completedWorkOrders} completed)
- Total cost: ${fmt(s.totalCost)} (parts ${fmt(s.totalPartsCost)}, labor ${fmt(s.totalLaborCost)}, avg ${fmt(s.avgCostPerWorkOrder)}/WO)
- Mechanics: ${mechanicCount} assigned
- By workload: ${topByLoad || 'No data'}
- With overdue WOs: ${topOverdue || 'None — all on track'}
- By cost: ${topCostMechanics || 'No cost data'}
- Top WO types: ${topTypesList || 'No data'}
${trendLine ? `- Latest month: ${trendLine}` : ''}

Respond in this exact format:
1. Status Summary
[2 sentences: fleet WO health, overdue severity, and cost exposure]

2. Mechanic Performance
[3 bullet points with specific mechanic names, WO counts, cost figures, and % completion]

3. Priority Actions
[3 prioritized actions with mechanic names and measurable targets]

4. Cost Watch
[1 metric — which mechanic or WO type is driving highest cost and why it matters]`;

    try {
      const result = await this.generateGeminiText(prompt);
      this.workOrderAiCache = { text: result, timestamp: Date.now() };
      return result;
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message || String(error) : JSON.stringify(error);
      console.error('[AnalyticsDataMart] Gemini error in getWorkOrderAiInsights', errorDetails);
      if (this.workOrderAiCache) return this.workOrderAiCache.text;
      return 'Work order AI insights are currently unavailable. Please try again later.';
    }
  }

  private getDefaultChecklistSteps(title: string) {
    return [
      { stepNumber: 1, title: 'Pre-Work Safety & Visual Inspection', description: 'Inspect workspace, secure vehicle, check for leaks/damage around area.', priority: 'HIGH' },
      { stepNumber: 2, title: 'Component Disassembly & Inspection', description: `Access and inspect components relevant to ${title}.`, priority: 'HIGH' },
      { stepNumber: 3, title: 'Part Replacement / Fluid Service', description: 'Replace worn parts or fluids according to VMMS service manual standards.', priority: 'HIGH' },
      { stepNumber: 4, title: 'Torque & Fastener Verification', description: 'Verify all bolts, fittings, and clamps are torqued to OEM specifications.', priority: 'MEDIUM' },
      { stepNumber: 5, title: 'Post-Service Test & Diagnostics', description: 'Run engine/system test, verify zero leakage or error codes.', priority: 'MEDIUM' },
      { stepNumber: 6, title: 'Sign-off & Work Order Logging', description: 'Log completed tasks, parts used, and updated odometer reading.', priority: 'LOW' },
    ];
  }

  async getReport() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const [statusBreakdown, monthlyTrend, vehicles, alerts, schedules] =
        await Promise.all([
          this.query(
            connection,
            `SELECT status, scheduleCount, percentage
             FROM maintenance_status_summary ORDER BY status`,
          ),
          this.query(
            connection,
            `SELECT monthKey, scheduledCount, completedCount, activeCount,
                    overdueCount, maintenanceCost
             FROM maintenance_monthly_trend ORDER BY monthKey`,
          ),
          this.query(
            connection,
            `SELECT vehicleId, plateNumber, vehicleModel, vehicleStatus,
                    currentOdometer, totalSchedules, activeSchedules,
                    completedSchedules, overdueSchedules, dueWithin7Days,
                    maintenanceCost, completionRate,
                    CAST(latestMaintenanceDate AS VARCHAR) AS latestMaintenanceDate,
                    CAST(nextDueDate AS VARCHAR) AS nextDueDate, riskLevel
             FROM vehicle_maintenance_kpi ORDER BY plateNumber`,
          ),
          this.query(
            connection,
            `SELECT a.alertId, a.scheduleId, a.vehiclePlate, a.severity, a.alertType,
                    a.maintenanceTitle, a.message, a.recommendedAction,
                    CAST(a.dueDate AS VARCHAR) AS dueDate,
                    CAST(a.generatedAt AS VARCHAR) AS generatedAt,
                    k.totalSchedules, k.activeSchedules, k.completedSchedules, k.overdueSchedules,
                    k.dueWithin7Days, k.completionRate, CAST(k.nextDueDate AS VARCHAR) AS nextDueDate,
                    k.vehicleStatus, k.riskLevel as rawRiskLevel
             FROM maintenance_alerts a
             LEFT JOIN vehicle_maintenance_kpi k ON a.vehiclePlate = k.plateNumber
             ORDER BY a.dueDate NULLS LAST`,
          ),
          this.query(
            connection,
            `SELECT scheduleId, vehiclePlate, maintenanceTitle, triggerType,
                    intervalType, assignedMechanic, scheduleStatus,
                    odometerReading, CAST(nextDueDate AS VARCHAR) AS nextDueDate
             FROM maintenance_schedule_summary
             ORDER BY nextDueDate NULLS LAST, maintenanceTitle`,
          ),
        ]);

      const normalizedVehicles = vehicles.map((vehicle: any) => {
        const riskScore = this.calculateRiskScore(vehicle);
        const computedRiskLevel = this.getRiskLevel(riskScore);
        const updatedVehicle = { ...vehicle, riskScore, riskLevel: computedRiskLevel };
        return {
          ...updatedVehicle,
          riskReason: this.buildVehicleRiskReason(updatedVehicle),
        };
      }).sort((a, b) => {
        const s = (sev: string) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
        const diff = s(a.riskLevel) - s(b.riskLevel);
        if (diff !== 0) return diff;
        return a.plateNumber.localeCompare(b.plateNumber);
      });

      const normalizedAlerts = alerts.map((alert: any) => {
        const vehicleForRisk = {
          overdueSchedules: alert.overdueSchedules ?? 0,
          activeSchedules: alert.activeSchedules ?? 0,
          completionRate: alert.completionRate ?? 100,
          nextDueDate: alert.nextDueDate,
          vehicleStatus: alert.vehicleStatus
        };
        const riskScore = this.calculateRiskScore(vehicleForRisk);
        const computedSeverity = this.getRiskLevel(riskScore);
        let severityToUse = computedSeverity;
        if (computedSeverity === 'LOW' && (alert.severity === 'HIGH' || alert.severity === 'MEDIUM')) {
          severityToUse = alert.severity;
        }
        return {
          ...alert,
          severity: severityToUse,
        };
      }).sort((a, b) => {
        const s = (sev: string) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
        return s(a.severity) - s(b.severity);
      });

      return {
        dataSource: this.dataSourceMetadata(snapshot),
        snapshot,
        statusBreakdown,
        monthlyTrend,
        vehicles: normalizedVehicles,
        alerts: normalizedAlerts,
        schedules,
      };
    });
  }

  async getAiInsights() {
    const isFresh =
      this.aiInsightsCache &&
      Date.now() - this.aiInsightsCache.timestamp < this.AI_CACHE_TTL_MS;

    // Return fresh cache immediately — no work needed.
    if (isFresh) {
      return this.aiInsightsCache!.text;
    }

    // Stale-while-revalidate: stale cache exists — return it instantly and
    // kick off a background refresh (only one at a time).
    if (this.aiInsightsCache) {
      if (!this.aiInsightsBuildPromise) {
        this.aiInsightsBuildPromise = this.buildAndCacheAiInsights().finally(() => {
          this.aiInsightsBuildPromise = null;
        });
      }
      return this.aiInsightsCache.text;
    }

    // Cold start: no cache at all — all concurrent callers share the same
    // in-flight promise so only one Gemini request is made.
    if (!this.aiInsightsBuildPromise) {
      this.aiInsightsBuildPromise = this.buildAndCacheAiInsights().finally(() => {
        this.aiInsightsBuildPromise = null;
      });
    }
    return this.aiInsightsBuildPromise;
  }

  private async buildAndCacheAiInsights(): Promise<string> {
    const [overview, alertsResult, vehicleKpis, forecast, anomalies, trends] = await Promise.all([
      this.getOverview(),
      this.getAlerts(),
      this.getVehicleKpis(),
      this.getPredictiveForecast(),
      this.getAnomalies(),
      this.getExpandedTrends(),
    ]);

    const totalSchedules = this.toNumber(overview.snapshot.totalSchedules);
    const totalVehicles = this.toNumber(overview.snapshot.totalVehicles);
    const totalMaintenanceCost = this.toNumber(overview.snapshot.totalMaintenanceCost);
    const avgCostPerSchedule = totalSchedules ? Number((totalMaintenanceCost / totalSchedules).toFixed(0)) : 0;
    const avgCostPerVehicle = totalVehicles ? Number((totalMaintenanceCost / totalVehicles).toFixed(0)) : 0;

    const s = overview.snapshot;
    const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

    const topAlerts = (alertsResult.alerts || [])
      .slice(0, 3)
      .map((alert) => `${alert.severity} ${alert.alertType} on ${alert.vehiclePlate}`)
      .join('; ');

    const topVehicles = (vehicleKpis.vehicles || [])
      .slice(0, 3)
      .map((vehicle) => `${vehicle.plateNumber} (${vehicle.riskLevel}, ${vehicle.overdueSchedules} overdue)`)
      .join('; ');

    const alertCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const alert of alertsResult.alerts || []) {
      const sev = String(alert.severity ?? 'LOW').toUpperCase();
      alertCounts[sev] = (alertCounts[sev] ?? 0) + 1;
    }

    const riskCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const vehicle of vehicleKpis.vehicles || []) {
      const risk = String(vehicle.riskLevel ?? 'LOW').toUpperCase();
      riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
    }

    const latestTrend = overview.monthlyTrend?.[overview.monthlyTrend.length - 1];
    const trendLine = latestTrend
      ? `Trend (${latestTrend.monthKey}): ${latestTrend.scheduledCount} sched, ${latestTrend.completedCount} done, ${latestTrend.activeCount} act, ${latestTrend.overdueCount} overdue, cost ${fmt(this.toNumber(latestTrend.maintenanceCost))}`
      : '';

    const anomaliesText = [
      ...(anomalies.repeatedFailures || []).slice(0, 3).map((r: any) => `${r.vehiclePlate} has ${r.incidentCount} ${r.maintenanceTitle}`),
      ...(anomalies.missingDates || []).slice(0, 2).map((m: any) => `Missing date: ${m.vehiclePlate} (${m.maintenanceTitle})`),
    ].join('; ');

    const trendsText = (trends.topTypes || []).map((t: any) => `${t.maintenanceTitle} (${t.count})`).join(', ');

    const prompt = `Analyze & report. No thinking.
Data:
- Fleet: ${s.totalVehicles} veh (${s.activeMaintenanceVehicles} in maint). Sched: ${s.totalSchedules} (${s.pendingSchedules} pend, ${s.inProgressSchedules} act, ${s.overdueSchedules} overdue, ${s.completedSchedules} done, ${s.dueWithin7Days} due 7d). AvgOdo: ${s.averageOdometer}. Cost: ${fmt(totalMaintenanceCost)} (Avg/Sched: ${fmt(avgCostPerSchedule)}, Avg/Veh: ${fmt(avgCostPerVehicle)}). Perf: ${s.fleetPerformance}%.${trendLine ? `\n- ${trendLine}` : ''}
- Alerts: ${topAlerts || 'None'} (${alertCounts.HIGH}H/${alertCounts.MEDIUM}M/${alertCounts.LOW}L)
- Risk: ${topVehicles || 'None'} (${riskCounts.HIGH}H/${riskCounts.MEDIUM}M/${riskCounts.LOW}L)
- Forecast: 7d:${forecast.dueIn7Days || 0}, 30d:${forecast.dueIn30Days || 0}, 90d:${forecast.dueIn90Days || 0}${anomaliesText ? `\n- Anomalies: ${anomaliesText}` : ''}${trendsText ? `\n- Top: ${trendsText}` : ''}

Format:
1. Summary (2 sentences)
2. Risks (Top 3 with data)
3. Actions (3 prioritized: overdue, adherence, resources)
4. Monitor (1 suggestion)`;

    try {
      const result = await this.generateGeminiText(prompt);
      this.aiInsightsCache = { text: result, timestamp: Date.now() };
      return result;
    } catch (error) {
      const errorDetails = error instanceof Error
        ? error.message || String(error)
        : JSON.stringify(error);

      if (error instanceof HttpException) {
        const status = error.getStatus();
        if (
          status === HttpStatus.TOO_MANY_REQUESTS ||
          status === HttpStatus.SERVICE_UNAVAILABLE
        ) {
          console.warn(
            '[AnalyticsDataMart] Gemini AI unavailable. Returning fallback AI summary.',
            errorDetails,
          );
          // Keep serving the stale cache rather than replacing with an error message
          if (this.aiInsightsCache) return this.aiInsightsCache.text;
          return 'AI insights are currently unavailable because the Gemini service is not available. Please try again later.';
        }
      }

      console.error(
        '[AnalyticsDataMart] Unexpected Gemini error in getAiInsights',
        errorDetails,
      );
      if (this.aiInsightsCache) return this.aiInsightsCache.text;
      return 'AI insights are currently unavailable due to an internal service error. Please try again later.';
    }
  }

  private getGeminiConfig() {
    const apiKey = process.env['GEMINI_API_KEY']?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Gemini API key is required for AI analytics. Set GEMINI_API_KEY in .env.',
      );
    }

    const apiBaseUrl = (
      process.env['GEMINI_API_URL']?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');

    const model = (process.env['GEMINI_MODEL']?.trim() || 'gemini-flash-latest').replace(
      /^models\//,
      '',
    );

    return { apiKey, apiBaseUrl, model };
  }

  private async generateGeminiText(prompt: string): Promise<string> {
    const { apiKey, apiBaseUrl, model } = this.getGeminiConfig();
    // Only use models confirmed to have free-tier quota available
    const modelCandidates = [
      model,
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
    ].filter((candidate, index, arr) => candidate && arr.indexOf(candidate) === index);

    let lastError: Error | null = null;

    for (const candidateModel of modelCandidates) {
      try {
        return await this.generateGeminiTextForModel(prompt, apiKey, apiBaseUrl, candidateModel);
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(
          `[AnalyticsDataMart] Gemini model ${candidateModel} failed, trying next fallback model.`,
          details,
        );

        if (
          error instanceof HttpException &&
          error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
        ) {
          lastError = error;
          continue;
        }

        if (
          error instanceof ServiceUnavailableException &&
          details.includes('HTTP 404')
        ) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new ServiceUnavailableException(
      'Gemini API failed: no available model succeeded. Please verify your API key and account quota.',
    );
  }

  private async generateGeminiTextForModel(
    prompt: string,
    apiKey: string,
    apiBaseUrl: string,
    model: string,
  ): Promise<string> {
    const contentRequestBody = JSON.stringify({
      model: `models/${model}`,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2500,
      },
    });

    const textRequestBody = JSON.stringify({
      model: `models/${model}`,
      prompt: {
        text: prompt,
      },
      temperature: 0.2,
      maxOutputTokens: 2500,
    });

    const requestOptions = {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(120_000),
    } as const;

    const requests = [
      {
        endpoint: `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        body: contentRequestBody,
      },
      {
        endpoint: `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateText`,
        body: textRequestBody,
      },
    ];

    type GeminiAttempt = {
      endpoint: string;
      status: number;
      body: string;
      payload: any;
    };

    const errors: string[] = [];
    let successfulResponse: GeminiAttempt | null = null;
    let lastErrorResponse: GeminiAttempt | null = null;
    let preservedQuotaErrorResponse: GeminiAttempt | null = null;
    let allowFallback = true;

    const attemptRequest = async (request: { endpoint: string; body: string }) => {
      const response = await fetch(request.endpoint, { ...requestOptions, body: request.body });
      const responseText = await response.text();

      let parsed: any = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }

      if (response.ok) {
        successfulResponse = {
          endpoint: request.endpoint,
          status: response.status,
          body: responseText,
          payload: parsed,
        };
        return true;
      }

      const errorAttempt: GeminiAttempt = {
        endpoint: request.endpoint,
        status: response.status,
        body: responseText,
        payload: parsed,
      };

      errors.push(`${request.endpoint} returned ${response.status}`);
      lastErrorResponse = errorAttempt;

      if (response.status === 429 || parsed?.error?.status === 'RESOURCE_EXHAUSTED') {
        preservedQuotaErrorResponse = errorAttempt;
        allowFallback = false;
      }

      if (response.status === 404) {
        return false;
      }

      return false;
    };

    for (const request of requests) {
      if (await attemptRequest(request)) {
        break;
      }
    }

    if (!successfulResponse && allowFallback && apiBaseUrl.includes('/v1beta')) {
      const fallbackUrl = apiBaseUrl.replace(/\/v1beta$/, '/v1beta2');
      for (const request of [
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateContent`,
          body: contentRequestBody,
        },
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateText`,
          body: textRequestBody,
        },
      ]) {
        if (await attemptRequest(request)) {
          break;
        }
      }
    }

    if (!successfulResponse && allowFallback && apiBaseUrl.includes('/v1beta2')) {
      const fallbackUrl = apiBaseUrl.replace(/\/v1beta2$/, '/v1beta');
      for (const request of [
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateContent`,
          body: contentRequestBody,
        },
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateText`,
          body: textRequestBody,
        },
      ]) {
        if (await attemptRequest(request)) {
          break;
        }
      }
    }

    if (!successfulResponse) {
      const errorResponse: GeminiAttempt | null = preservedQuotaErrorResponse ?? lastErrorResponse;
      if (errorResponse !== null) {
        const resolvedErrorResponse = errorResponse as GeminiAttempt;
        const rawErrorMessage = resolvedErrorResponse.payload?.error?.message ?? resolvedErrorResponse.body;
        const errorMessage = rawErrorMessage?.toString().trim() ||
          `HTTP ${resolvedErrorResponse.status} at ${resolvedErrorResponse.endpoint} returned no details`;
        if (
          resolvedErrorResponse.status === 429 ||
          resolvedErrorResponse.payload?.error?.status === 'RESOURCE_EXHAUSTED'
        ) {
          throw new HttpException(
            `Gemini quota exceeded: ${errorMessage}`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        throw new ServiceUnavailableException(
          `Gemini API failed: ${errorMessage}`,
        );
      }

      throw new ServiceUnavailableException(
        `Gemini API was unreachable. Check GEMINI_API_URL and network connectivity. Tried endpoints: ${errors.join(', ')}`,
      );
    }

    const successful = successfulResponse as GeminiAttempt;
    const payload = successful.payload;
    if (!payload) {
      throw new ServiceUnavailableException(
        `Gemini API returned non-JSON response (${successful.status}).`,
      );
    }

    const output = this.extractGeminiTextOutput(payload)?.trim();
    if (!output) {
      throw new ServiceUnavailableException(
        'Gemini API returned no output.',
      );
    }

    return output;
  }

  private extractGeminiTextOutput(payload: any): string | null {
    const candidate = payload?.candidates?.[0];
    if (!candidate) return null;

    if (typeof candidate.output === 'string' && candidate.output.trim()) {
      return candidate.output;
    }

    const content = candidate.content;
    if (!content) return null;

    if (typeof content === 'string' && content.trim()) {
      return content;
    }

    if (typeof content.text === 'string' && content.text.trim()) {
      return content.text;
    }

    if (typeof content.text?.text === 'string' && content.text.text.trim()) {
      return content.text.text;
    }

    if (Array.isArray(content.parts)) {
      return content.parts
        .map((part: any) => part?.text ?? (typeof part === 'string' ? part : ''))
        .filter((part: string) => typeof part === 'string' && part.length > 0)
        .join(' ')
        .trim() || null;
    }

    return null;
  }

  private async getSnapshot(
    connection: DuckDBConnection,
  ): Promise<DataMartRow> {
    const rows = await this.query(
      connection,
      `SELECT snapshotKey,
              CAST(generatedAt AS VARCHAR) AS generatedAt,
              CAST(sourceMaxUpdatedAt AS VARCHAR) AS sourceMaxUpdatedAt,
              totalVehicles, availableVehicles, underMaintenanceVehicles,
              underRepairVehicles, totalSchedules, pendingSchedules,
              dueSchedules, inProgressSchedules, completedSchedules,
              overdueSchedules, cancelledSchedules, dueWithin7Days,
              activeMaintenanceVehicles, averageOdometer,
              totalMaintenanceCost, completionRate, fleetPerformance
       FROM analytics_snapshot WHERE snapshotKey = 'current'`,
    );
    if (!rows[0]) {
      return {
        snapshotKey: 'current',
        generatedAt: new Date().toISOString(),
        sourceMaxUpdatedAt: null,
        totalVehicles: 0, availableVehicles: 0, underMaintenanceVehicles: 0,
        underRepairVehicles: 0, totalSchedules: 0, pendingSchedules: 0,
        dueSchedules: 0, inProgressSchedules: 0, completedSchedules: 0,
        overdueSchedules: 0, cancelledSchedules: 0, dueWithin7Days: 0,
        activeMaintenanceVehicles: 0, averageOdometer: 0,
        totalMaintenanceCost: 0, completionRate: 0, fleetPerformance: 0
      };
    }
    return rows[0];
  }

  private dataSourceMetadata(snapshot: DataMartRow) {
    const generatedAt = String(snapshot['generatedAt']);
    const generatedTime = Date.parse(generatedAt);
    const maxAgeMinutes = this.positiveNumber(
      process.env['ANALYTICS_MAX_AGE_MINUTES'],
      1440,
    );
    const ageSeconds = Number.isFinite(generatedTime)
      ? Math.max(0, Math.floor((Date.now() - generatedTime) / 1000))
      : null;

    return {
      type: 'DUCKDB',
      authoritativeFor: 'PREPARED_ANALYTICS_AND_REPORTING',
      generatedAt,
      sourceMaxUpdatedAt: snapshot['sourceMaxUpdatedAt'] ?? null,
      ageSeconds,
      isStale: ageSeconds === null || ageSeconds > maxAgeMinutes * 60,
      maxAgeMinutes,
    };
  }

  private positiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async query(
    connection: DuckDBConnection,
    sql: string,
  ): Promise<DataMartRow[]> {
    return this.dataMartService.query(sql);
  }

  private async withDataMart<T>(
    action: (connection: DuckDBConnection) => Promise<T>,
  ): Promise<T> {
    try {
      const connection = await this.dataMartService.getConnection();
      return await action(connection);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      console.error('[AnalyticsDataMart] DuckDB query failed', error);
      throw new ServiceUnavailableException(
        'Prepared analytics are unavailable. Run npm run migrate and try again.',
      );
    }
  }

  async onModuleDestroy() {
    await this.dataMartService.onModuleDestroy();
  }

  /**
   * Reset cached DuckDB connection in shared DuckDbDataMartService.
   */
  resetConnection(): void {
    this.dataMartService.resetConnection().catch(() => undefined);
  }

  private async ensurePreparedData(connection: DuckDBConnection): Promise<void> {
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
      )
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS maintenance_status_summary (
        status VARCHAR,
        scheduleCount INTEGER,
        percentage DOUBLE
      )
    `);

    await connection.runAndReadAll(`
      CREATE TABLE IF NOT EXISTS maintenance_monthly_trend (
        monthKey VARCHAR,
        scheduledCount INTEGER,
        completedCount INTEGER,
        activeCount INTEGER,
        overdueCount INTEGER,
        maintenanceCost DOUBLE
      )
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
      )
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
      )
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
      )
    `);

    const snapshotCount = await this.query(
      connection,
      "SELECT COUNT(*) AS rowCount FROM analytics_snapshot",
    );
    // Data should be natively populated by the main service or ETL. 
    // If rowCount is 0, we simply return empty analytics via getSnapshot() instead of mocking.
  }
}
