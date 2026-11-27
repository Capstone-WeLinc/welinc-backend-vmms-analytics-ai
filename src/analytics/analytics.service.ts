import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDbDataMartService } from './duckdb-datamart.service';
import { GeminiAiService } from './gemini-ai.service';
import { VehicleKpiService } from './vehicle-kpi.service';
import { WorkOrderAnalyticsService } from './work-order-analytics.service';

type DataMartRow = Record<string, unknown>;

interface AnalyticsInsightMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

interface AnalyticsInsightObservation {
  label: string;
  value: string;
}

export interface AnalyticsInsightsResponse {
  aiSummary: string;
  evidence: {
    snapshotKey: string;
    generatedAt: string;
    sourceMaxUpdatedAt: string | null;
    ageSeconds: number | null;
    isStale: boolean;
    reportingPeriod: { start: string | null; end: string | null };
    metrics: AnalyticsInsightMetric[];
    observations: AnalyticsInsightObservation[];
    limitations: string[];
  };
}

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly aiInsightsCacheTtlMs = 10 * 60 * 1000;
  private aiInsightsCache: {
    snapshotId: string;
    timestamp: number;
    response: AnalyticsInsightsResponse;
  } | null = null;
  private aiInsightsBuildPromise: Promise<AnalyticsInsightsResponse> | null =
    null;

  constructor(
    private readonly dataMartService: DuckDbDataMartService,
    private readonly geminiAiService: GeminiAiService,
    private readonly vehicleKpiService: VehicleKpiService,
    private readonly workOrderAnalyticsService: WorkOrderAnalyticsService,
  ) {
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

  async getVehicleKpis() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      return this.vehicleKpiService.getVehicleKpis(this.dataSourceMetadata(snapshot));
    });
  }

  async getAlerts() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      return this.vehicleKpiService.getAlerts(this.dataSourceMetadata(snapshot));
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

  // ─── Work Order Delegates ──────────────────────────────────────────────────

  async getWorkOrderSummary() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      return this.workOrderAnalyticsService.getWorkOrderSummary(this.dataSourceMetadata(snapshot));
    });
  }

  async getMechanicWorkload() {
    return this.workOrderAnalyticsService.getMechanicWorkload();
  }

  async getWorkOrderTimeline() {
    return this.workOrderAnalyticsService.getWorkOrderTimeline();
  }

  async getScheduleWorkOrders(mechanic?: string, status?: string, limit = '100') {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      return this.workOrderAnalyticsService.getScheduleWorkOrders(this.dataSourceMetadata(snapshot), mechanic, status, limit);
    });
  }

  async getWorkOrderById(id: string) {
    return this.workOrderAnalyticsService.getWorkOrderById(id);
  }

  async getWorkOrderRecommendations(
    id: string,
    customTitle?: string,
    customVehicle?: string,
    checklistItems?: Array<{ text: string }> | string[],
  ) {
    return this.workOrderAnalyticsService.getWorkOrderRecommendations(id, customTitle, customVehicle, checklistItems);
  }

  async getScheduleWithAi(id: string) {
    return this.getWorkOrderRecommendations(id);
  }

  async getWorkOrderAiInsights(): Promise<string> {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      return this.workOrderAnalyticsService.getWorkOrderAiInsights(this.dataSourceMetadata(snapshot));
    });
  }

  async getAiInsights(
    allowGeneration = true,
  ): Promise<AnalyticsInsightsResponse> {
    const cached = this.aiInsightsCache;
    if (!allowGeneration) {
      if (cached) {
        return this.markInsightStale(
          cached.response,
          'Analytics data validation is stale or unavailable; showing the previous insight.',
        );
      }
      throw new ServiceUnavailableException(
        'AI insights cannot be generated until analytics data is current and validated.',
      );
    }

    let overview: Awaited<ReturnType<AnalyticsService['getOverview']>>;
    try {
      overview = await this.getOverview();
    } catch (error) {
      if (cached) {
        return this.markInsightStale(
          cached.response,
          'The current analytics snapshot is unavailable; showing the previous insight.',
        );
      }
      throw error;
    }

    const snapshotId = [
      overview.snapshot.snapshotKey,
      overview.dataSource.generatedAt,
      overview.dataSource.sourceMaxUpdatedAt ?? '',
    ].join(':');
    if (overview.dataSource.isStale) {
      if (cached) {
        return this.markInsightStale(
          cached.response,
          'The current analytics snapshot is stale; showing the previous insight.',
        );
      }
      throw new ServiceUnavailableException(
        'AI insights cannot be generated from stale analytics data.',
      );
    }
    if (
      cached?.snapshotId === snapshotId &&
      Date.now() - cached.timestamp < this.aiInsightsCacheTtlMs
    ) {
      return cached.response;
    }
    if (this.aiInsightsBuildPromise) {
      return this.aiInsightsBuildPromise;
    }

    const buildPromise = (async (): Promise<AnalyticsInsightsResponse> => {
      const [alertsResult, vehicleKpis, forecast, anomalies, trends] =
        await Promise.all([
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
      const fmt = (n: number) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n}`;

      const topAlerts = (alertsResult.alerts || [])
        .slice(0, 3)
        .map((alert: any) => `${alert.severity} ${alert.alertType} on ${alert.vehiclePlate}`)
        .join('; ');

      const topVehicles = (vehicleKpis.vehicles || [])
        .slice(0, 3)
        .map((vehicle: any) => `${vehicle.plateNumber} (${vehicle.riskLevel}, ${vehicle.overdueSchedules} overdue)`)
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

      const prompt = `Analyze and report using only the supplied data. Do not invent counts, dates, costs, or percentages. If evidence is insufficient, state that limitation.
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

      const aiSummary = await this.geminiAiService.generateGeminiText(prompt);
      return {
        aiSummary,
        evidence: this.buildInsightEvidence(
          overview.snapshot,
          overview.monthlyTrend,
          overview.dataSource,
          {
            metrics: [
              { key: 'highAlerts', label: 'High-severity alerts', value: alertCounts.HIGH, unit: 'alerts' },
              { key: 'mediumAlerts', label: 'Medium-severity alerts', value: alertCounts.MEDIUM, unit: 'alerts' },
              { key: 'lowAlerts', label: 'Low-severity alerts', value: alertCounts.LOW, unit: 'alerts' },
              { key: 'highRiskVehicles', label: 'High-risk vehicles', value: riskCounts.HIGH, unit: 'vehicles' },
              { key: 'mediumRiskVehicles', label: 'Medium-risk vehicles', value: riskCounts.MEDIUM, unit: 'vehicles' },
              { key: 'lowRiskVehicles', label: 'Low-risk vehicles', value: riskCounts.LOW, unit: 'vehicles' },
              { key: 'forecastDueIn7Days', label: 'Forecast due in 7 days', value: this.toNumber(forecast.dueIn7Days), unit: 'schedules' },
              { key: 'forecastDueIn30Days', label: 'Forecast due in 30 days', value: this.toNumber(forecast.dueIn30Days), unit: 'schedules' },
              { key: 'forecastDueIn90Days', label: 'Forecast due in 90 days', value: this.toNumber(forecast.dueIn90Days), unit: 'schedules' },
              { key: 'repeatedFailureCount', label: 'Repeated-failure records', value: anomalies.repeatedFailures.length, unit: 'records' },
              { key: 'missingDateCount', label: 'Missing-date records', value: anomalies.missingDates.length, unit: 'records' },
              { key: 'topMaintenanceTypeCount', label: 'Top maintenance types', value: trends.topTypes.length, unit: 'types' },
            ],
            observations: [
              { label: 'Alert examples', value: topAlerts || 'None' },
              { label: 'Vehicle risk examples', value: topVehicles || 'None' },
              { label: 'Latest monthly trend', value: trendLine || 'No monthly trend available' },
              { label: 'Repeated failures and missing dates', value: anomaliesText || 'None' },
              { label: 'Top maintenance types', value: trendsText || 'None' },
            ],
          },
        ),
      };
    })();

    this.aiInsightsBuildPromise = buildPromise;
    try {
      const response = await buildPromise;
      this.aiInsightsCache = {
        snapshotId,
        timestamp: Date.now(),
        response,
      };
      return response;
    } catch (error) {
      if (cached) {
        return this.markInsightStale(
          cached.response,
          'AI refresh failed; showing the previous insight.',
        );
      }
      throw error;
    } finally {
      if (this.aiInsightsBuildPromise === buildPromise) {
        this.aiInsightsBuildPromise = null;
      }
    }
  }

  private buildInsightEvidence(
    snapshot: DataMartRow,
    monthlyTrend: DataMartRow[],
    dataSource: Awaited<ReturnType<AnalyticsService['getOverview']>>['dataSource'],
    supportingEvidence: {
      metrics: AnalyticsInsightMetric[];
      observations: AnalyticsInsightObservation[];
    },
  ): AnalyticsInsightsResponse['evidence'] {
    const metric = (
      key: string,
      label: string,
      unit?: string,
    ): AnalyticsInsightMetric => ({
      key,
      label,
      value: this.toNumber(snapshot[key]),
      ...(unit ? { unit } : {}),
    });
    const generatedAt = String(dataSource.generatedAt);
    return {
      snapshotKey: String(snapshot.snapshotKey),
      generatedAt,
      sourceMaxUpdatedAt:
        dataSource.sourceMaxUpdatedAt === null
          ? null
          : String(dataSource.sourceMaxUpdatedAt),
      ageSeconds: dataSource.ageSeconds,
      isStale: dataSource.isStale,
      reportingPeriod: {
        start: monthlyTrend[0]?.['monthKey']
          ? String(monthlyTrend[0]['monthKey'])
          : null,
        end: monthlyTrend.length
          ? String(monthlyTrend[monthlyTrend.length - 1]['monthKey'])
          : null,
      },
      metrics: [
        metric('totalVehicles', 'Total vehicles', 'vehicles'),
        metric('totalSchedules', 'Total schedules', 'schedules'),
        metric('pendingSchedules', 'Pending schedules', 'schedules'),
        metric('inProgressSchedules', 'In-progress schedules', 'schedules'),
        metric('overdueSchedules', 'Overdue schedules', 'schedules'),
        metric('completedSchedules', 'Completed schedules', 'schedules'),
        metric('dueWithin7Days', 'Due within 7 days', 'schedules'),
        metric('averageOdometer', 'Average odometer'),
        metric('totalMaintenanceCost', 'Total maintenance cost', 'currency'),
        metric('completionRate', 'Completion rate', 'percent'),
        metric('fleetPerformance', 'Fleet performance', 'percent'),
        ...supportingEvidence.metrics,
      ],
      observations: supportingEvidence.observations,
      limitations: [
        'Analytics is a derived snapshot; VMMS source records remain authoritative.',
        'AI analysis is advisory and does not create or change operational records.',
        'Predictive statements are not confirmed mechanical diagnoses.',
      ],
    };
  }

  private markInsightStale(
    response: AnalyticsInsightsResponse,
    limitation: string,
  ): AnalyticsInsightsResponse {
    const generatedTime = Date.parse(response.evidence.generatedAt);
    return {
      ...response,
      evidence: {
        ...response.evidence,
        ageSeconds: Number.isFinite(generatedTime)
          ? Math.max(0, Math.floor((Date.now() - generatedTime) / 1000))
          : null,
        isStale: true,
        limitations: [...new Set([...response.evidence.limitations, limitation])],
      },
    };
  }

  async getReport() {
    return this.withDataMart(async (connection) => {
      const snapshot = await this.getSnapshot(connection);
      const [statusBreakdown, monthlyTrend, vehiclesResult, alertsResult, schedules] =
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
          this.getVehicleKpis(),
          this.getAlerts(),
          this.query(
            connection,
            `SELECT scheduleId, vehiclePlate, maintenanceTitle, triggerType,
                    intervalType, assignedMechanic, scheduleStatus,
                    odometerReading, CAST(nextDueDate AS VARCHAR) AS nextDueDate
             FROM maintenance_schedule_summary
             ORDER BY nextDueDate NULLS LAST, maintenanceTitle`,
          ),
        ]);

      return {
        dataSource: this.dataSourceMetadata(snapshot),
        snapshot,
        statusBreakdown,
        monthlyTrend,
        vehicles: vehiclesResult.vehicles,
        alerts: alertsResult.alerts,
        schedules,
      };
    });
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
    const snapshot = rows[0];
    if (!snapshot) {
      throw new ServiceUnavailableException(
        'Analytics snapshot is unavailable. Run npm run migrate and sync the source data.',
      );
    }
    const generatedTime = Date.parse(String(snapshot['generatedAt'] ?? ''));
    const sourceMaxUpdatedAt = snapshot['sourceMaxUpdatedAt'];
    const sourceMaxUpdatedTime =
      sourceMaxUpdatedAt === null || sourceMaxUpdatedAt === undefined
        ? null
        : Date.parse(String(sourceMaxUpdatedAt));
    const numericFields = [
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
    ];
    if (
      !Number.isFinite(generatedTime) ||
      generatedTime > Date.now() + 60_000 ||
      (Number(snapshot['totalVehicles']) + Number(snapshot['totalSchedules']) > 0 &&
        sourceMaxUpdatedAt === null) ||
      (sourceMaxUpdatedTime !== null &&
        (!Number.isFinite(sourceMaxUpdatedTime) ||
          sourceMaxUpdatedTime > Date.now() + 60_000)) ||
      numericFields.some(
        (field) =>
          !Number.isFinite(Number(snapshot[field])) ||
          Number(snapshot[field]) < 0,
      ) ||
      Number(snapshot['completionRate']) > 100 ||
      Number(snapshot['fleetPerformance']) > 100
    ) {
      throw new ServiceUnavailableException(
        'Analytics snapshot is invalid and cannot be reported.',
      );
    }
    return snapshot;
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
      state:
        ageSeconds === null
          ? 'unavailable'
          : ageSeconds > maxAgeMinutes * 60
            ? 'stale'
            : 'current',
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

  resetConnection(): void {
    this.dataMartService.resetConnection().catch(() => undefined);
  }
}
