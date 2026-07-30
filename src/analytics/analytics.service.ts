import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { HttpException, HttpStatus, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

type DataMartRow = Record<string, unknown>;

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly databasePath = this.resolveDatabasePath();
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private connecting: Promise<DuckDBConnection> | null = null;

  constructor() {
    console.log('[AnalyticsDataMart] Starting service');
    console.log('[AnalyticsDataMart] current working directory:', process.cwd());
    console.log('[AnalyticsDataMart] resolved DuckDB path:', this.databasePath);
  }

  private resolveDatabasePath(): string {
    const configuredPath = process.env['DUCKDB_PATH']?.trim();
    if (configuredPath) {
      return path.resolve(configuredPath);
    }

    const candidates = [
      path.resolve(process.cwd(), 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', '..', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'vmms-backend', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'welinc-backend-vmms', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'welinc-backend-vmms-analytics-ai', 'database', 'vmms_datamart.duckdb'),
    ];

    for (const candidate of candidates) {
      try {
        const { accessSync } = require('node:fs');
        accessSync(candidate);
        return candidate;
      } catch {
        // try next candidate
      }
    }

    return candidates[0];
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
    const [overview, alertsResult, vehicleKpis, forecast, anomalies, trends] = await Promise.all([
      this.getOverview(),
      this.getAlerts(),
      this.getVehicleKpis(),
      this.getPredictiveForecast(),
      this.getAnomalies(),
      this.getExpandedTrends(),
    ]);

    const totalSchedules = this.toNumber(overview.snapshot.totalSchedules);
    const overdueSchedules = this.toNumber(overview.snapshot.overdueSchedules);
    const dueWithin7Days = this.toNumber(overview.snapshot.dueWithin7Days);
    const pendingSchedules = this.toNumber(overview.snapshot.pendingSchedules);
    const totalVehicles = this.toNumber(overview.snapshot.totalVehicles);
    const activeMaintenanceVehicles = this.toNumber(overview.snapshot.activeMaintenanceVehicles);
    const totalMaintenanceCost = this.toNumber(overview.snapshot.totalMaintenanceCost);

    const overdueRate = totalSchedules ? Number(((overdueSchedules / totalSchedules) * 100).toFixed(1)) : 0;
    const dueSoonRate = totalSchedules ? Number(((dueWithin7Days / totalSchedules) * 100).toFixed(1)) : 0;
    const pendingRate = totalSchedules ? Number(((pendingSchedules / totalSchedules) * 100).toFixed(1)) : 0;
    const activeFleetRate = totalVehicles ? Number(((activeMaintenanceVehicles / totalVehicles) * 100).toFixed(1)) : 0;
    const avgCostPerSchedule = totalSchedules ? Number((totalMaintenanceCost / totalSchedules).toFixed(2)) : 0;
    const avgCostPerVehicle = totalVehicles ? Number((totalMaintenanceCost / totalVehicles).toFixed(2)) : 0;

    const summaryLines = [
      `Total vehicles: ${overview.snapshot.totalVehicles}`,
      `Total schedules: ${overview.snapshot.totalSchedules}`,
      `Pending schedules: ${overview.snapshot.pendingSchedules}`,
      `Active schedules: ${overview.snapshot.inProgressSchedules}`,
      `Overdue schedules: ${overview.snapshot.overdueSchedules}`,
      `Completed schedules: ${overview.snapshot.completedSchedules}`,
      `Due within 7 days: ${overview.snapshot.dueWithin7Days}`,
      `Average odometer: ${overview.snapshot.averageOdometer}`,
      `Total maintenance cost: ${overview.snapshot.totalMaintenanceCost}`,
      `Average cost per schedule: ${avgCostPerSchedule}`,
      `Average cost per vehicle: ${avgCostPerVehicle}`,
      `Overdue rate: ${overdueRate}%`,
      `Due soon rate: ${dueSoonRate}%`,
      `Pending rate: ${pendingRate}%`,
      `Active maintenance fleet rate: ${activeFleetRate}%`,
      `Completion rate: ${overview.snapshot.completionRate}%`,
      `Fleet performance: ${overview.snapshot.fleetPerformance}%`,
    ];

    const topStatuses = (overview.statusBreakdown || [])
      .slice(0, 4)
      .map((row) => {
        const percentage = typeof row.percentage === 'number'
          ? row.percentage.toFixed(1)
          : String(row.percentage ?? 'n/a');
        return `${row.status}: ${row.scheduleCount} (${percentage}%)`;
      })
      .join(', ');

    const alertCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, OTHER: 0 };
    for (const alert of alertsResult.alerts || []) {
      const severity = String(alert.severity ?? 'OTHER').toUpperCase();
      alertCounts[severity] = (alertCounts[severity] ?? 0) + 1;
    }

    const riskCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, OTHER: 0 };
    for (const vehicle of vehicleKpis.vehicles || []) {
      const risk = String(vehicle.riskLevel ?? 'OTHER').toUpperCase();
      riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
    }

    const topAlerts = (alertsResult.alerts || [])
      .slice(0, 3)
      .map((alert) => `${alert.severity} ${alert.alertType} on ${alert.vehiclePlate}`)
      .join('; ');

    const topVehicles = (vehicleKpis.vehicles || [])
      .slice(0, 3)
      .map((vehicle) => `${vehicle.plateNumber} (${vehicle.riskLevel}, ${vehicle.overdueSchedules} overdue)`)
      .join('; ');

    const latestTrend = overview.monthlyTrend?.[overview.monthlyTrend.length - 1];
    const trendSummary = latestTrend
      ? `Latest month (${latestTrend.monthKey}) scheduled ${latestTrend.scheduledCount}, completed ${latestTrend.completedCount}, active ${latestTrend.activeCount}, overdue ${latestTrend.overdueCount}, cost ${latestTrend.maintenanceCost}`
      : 'No monthly trend data available.';

    const anomaliesText = [
      ...(anomalies.repeatedFailures || []).slice(0, 3).map((r: any) => `Repeated: ${r.vehiclePlate} has ${r.incidentCount} instances of ${r.maintenanceTitle}`),
      ...(anomalies.missingDates || []).slice(0, 3).map((m: any) => `Missing date: ${m.vehiclePlate} schedule ${m.scheduleId} (${m.maintenanceTitle})`),
    ].join('; ');

    const forecastText = `Due in 7 days: ${forecast.dueIn7Days || 0}, 30 days: ${forecast.dueIn30Days || 0}, 90 days: ${forecast.dueIn90Days || 0}`;

    const trendsText = (trends.topTypes || []).map((t: any) => `${t.maintenanceTitle} (${t.count})`).join(', ');

    const prompt = `Role: Fleet maintenance analyst. Task: Write a concise, actionable report on scheduling, overdue recovery, and resource planning. Use ONLY the provided data. Do not use section titles like "Executive Summary".

Data:
- Summary: ${summaryLines.join(', ')}
- Statuses: ${topStatuses || 'N/A'}
- Trend: ${trendSummary}
- Alerts: ${topAlerts || 'N/A'}
- High-risk: ${topVehicles || 'N/A'}
- Alert counts: H:${alertCounts.HIGH} M:${alertCounts.MEDIUM} L:${alertCounts.LOW}
- Risk profile: H:${riskCounts.HIGH} M:${riskCounts.MEDIUM} L:${riskCounts.LOW}
- Forecast: ${forecastText}
- Anomalies: ${anomaliesText || 'None detected'}
- Top Maintenance Types: ${trendsText || 'N/A'}

Output requirements:
1. Executive summary (2-3 sentences).
2. Top 3 scheduling risks with data points.
3. 3 prioritized actions focused on overdue work, adherence, and resources.
4. 1 monitoring recommendation for next month.`;

    try {
      return await this.generateGeminiText(prompt);
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
          return 'AI insights are currently unavailable because the Gemini service is not available. Please try again later.';
        }
      }

      console.error(
        '[AnalyticsDataMart] Unexpected Gemini error in getAiInsights',
        errorDetails,
      );
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

    const model = (process.env['GEMINI_MODEL']?.trim() || 'gemini-3.5-flash').replace(
      /^models\//,
      '',
    );

    return { apiKey, apiBaseUrl, model };
  }

  private async generateGeminiText(prompt: string): Promise<string> {
    const { apiKey, apiBaseUrl, model } = this.getGeminiConfig();
    const modelCandidates = [
      model,
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
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
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 400,
      },
    });

    const textRequestBody = JSON.stringify({
      model: `models/${model}`,
      prompt: {
        text: prompt,
      },
      temperature: 0.3,
      maxOutputTokens: 400,
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
    const reader = await connection.runAndReadAll(sql);
    return reader
      .getRowObjectsJS()
      .map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === 'bigint' ? Number(value) : value,
          ]),
        ),
      );
  }

  private async withDataMart<T>(
    action: (connection: DuckDBConnection) => Promise<T>,
  ): Promise<T> {
    try {
      const connection = await this.getConnection();
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
    this.connection?.closeSync();
    this.connection = null;
    this.instance = null;
  }

  private async getConnection(): Promise<DuckDBConnection> {
    if (this.connection) {
      return this.connection;
    }

    if (this.connecting) {
      return await this.connecting;
    }

    this.connecting = (async () => {
      try {
        await mkdir(path.dirname(this.databasePath), { recursive: true });
        await access(this.databasePath).catch(() => undefined);
        this.instance = await DuckDBInstance.create(this.databasePath);
        this.connection = await this.instance.connect();
        await this.ensurePreparedData(this.connection);
        return this.connection as DuckDBConnection;
      } catch (error) {
        this.connection?.closeSync();
        this.connection = null;
        this.instance = null;
        throw error;
      } finally {
        this.connecting = null;
      }
    })();

    return await this.connecting;
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
