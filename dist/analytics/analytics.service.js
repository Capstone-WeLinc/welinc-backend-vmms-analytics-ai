"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const duckdb_datamart_service_1 = require("./duckdb-datamart.service");
const gemini_ai_service_1 = require("./gemini-ai.service");
const vehicle_kpi_service_1 = require("./vehicle-kpi.service");
const work_order_analytics_service_1 = require("./work-order-analytics.service");
let AnalyticsService = class AnalyticsService {
    dataMartService;
    geminiAiService;
    vehicleKpiService;
    workOrderAnalyticsService;
    constructor(dataMartService, geminiAiService, vehicleKpiService, workOrderAnalyticsService) {
        this.dataMartService = dataMartService;
        this.geminiAiService = geminiAiService;
        this.vehicleKpiService = vehicleKpiService;
        this.workOrderAnalyticsService = workOrderAnalyticsService;
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
                this.query(connection, `SELECT status, scheduleCount, percentage
           FROM maintenance_status_summary
           ORDER BY CASE status
             WHEN 'PENDING' THEN 1 WHEN 'DUE' THEN 2 WHEN 'IN_PROGRESS' THEN 3
             WHEN 'COMPLETED' THEN 4 WHEN 'OVERDUE' THEN 5 WHEN 'CANCELLED' THEN 6
             ELSE 7 END`),
                this.query(connection, `SELECT monthKey, scheduledCount, completedCount, activeCount,
                  overdueCount, maintenanceCost
           FROM maintenance_monthly_trend
           ORDER BY monthKey`),
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
    buildOverviewSummaryMetrics(snapshot) {
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
    async searchMaintenanceSchedules(query, limit = '6') {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const normalizedQuery = String(query ?? '').trim().toLowerCase();
            const max = Math.min(Math.max(Number(limit) || 6, 1), 50);
            const whereClause = normalizedQuery
                ? `WHERE LOWER(vehiclePlate) LIKE '%${normalizedQuery.replace(/'/g, "''")}%' OR LOWER(maintenanceTitle) LIKE '%${normalizedQuery.replace(/'/g, "''")}%' OR LOWER(assignedMechanic) LIKE '%${normalizedQuery.replace(/'/g, "''")}%'`
                : '';
            const schedules = await this.query(connection, `SELECT scheduleId, vehiclePlate, maintenanceTitle, triggerType,
                intervalType, assignedMechanic, scheduleStatus,
                odometerReading, CAST(nextDueDate AS VARCHAR) AS nextDueDate
         FROM maintenance_schedule_summary
         ${whereClause}
         ORDER BY nextDueDate NULLS LAST, maintenanceTitle
         LIMIT ${max}`);
            return { dataSource: this.dataSourceMetadata(snapshot), schedules };
        });
    }
    async getPredictiveForecast() {
        return this.withDataMart(async (connection) => {
            const forecast = await this.query(connection, `WITH EnrichedSchedules AS (
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
        FROM PredictedSchedules`);
            return forecast[0];
        });
    }
    async getAnomalies() {
        return this.withDataMart(async (connection) => {
            const repeatedFailures = await this.query(connection, `SELECT vehiclePlate, maintenanceTitle, CAST(COUNT(*) AS INTEGER) as incidentCount
         FROM maintenance_schedule_summary 
         GROUP BY vehiclePlate, maintenanceTitle 
         HAVING COUNT(*) >= 2
         ORDER BY incidentCount DESC`);
            const missingDates = await this.query(connection, `SELECT vehiclePlate, maintenanceTitle, scheduleId
         FROM maintenance_schedule_summary
         WHERE nextDueDate IS NULL AND scheduleStatus != 'COMPLETED'`);
            return { repeatedFailures, missingDates };
        });
    }
    async getExpandedTrends() {
        return this.withDataMart(async (connection) => {
            const topTypes = await this.query(connection, `SELECT maintenanceTitle, CAST(COUNT(*) AS INTEGER) as count
         FROM maintenance_schedule_summary
         GROUP BY maintenanceTitle
         ORDER BY count DESC
         LIMIT 5`);
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
    async getScheduleWorkOrders(mechanic, status, limit = '100') {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            return this.workOrderAnalyticsService.getScheduleWorkOrders(this.dataSourceMetadata(snapshot), mechanic, status, limit);
        });
    }
    async getWorkOrderById(id) {
        return this.workOrderAnalyticsService.getWorkOrderById(id);
    }
    async getWorkOrderRecommendations(id, customTitle, customVehicle, checklistItems) {
        return this.workOrderAnalyticsService.getWorkOrderRecommendations(id, customTitle, customVehicle, checklistItems);
    }
    async getScheduleWithAi(id) {
        return this.getWorkOrderRecommendations(id);
    }
    async getWorkOrderAiInsights() {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            return this.workOrderAnalyticsService.getWorkOrderAiInsights(this.dataSourceMetadata(snapshot));
        });
    }
    async getAiInsights() {
        return this.geminiAiService.getAiInsights(async () => {
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
            const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
            const topAlerts = (alertsResult.alerts || [])
                .slice(0, 3)
                .map((alert) => `${alert.severity} ${alert.alertType} on ${alert.vehiclePlate}`)
                .join('; ');
            const topVehicles = (vehicleKpis.vehicles || [])
                .slice(0, 3)
                .map((vehicle) => `${vehicle.plateNumber} (${vehicle.riskLevel}, ${vehicle.overdueSchedules} overdue)`)
                .join('; ');
            const alertCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
            for (const alert of alertsResult.alerts || []) {
                const sev = String(alert.severity ?? 'LOW').toUpperCase();
                alertCounts[sev] = (alertCounts[sev] ?? 0) + 1;
            }
            const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
            for (const vehicle of vehicleKpis.vehicles || []) {
                const risk = String(vehicle.riskLevel ?? 'LOW').toUpperCase();
                riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
            }
            const latestTrend = overview.monthlyTrend?.[overview.monthlyTrend.length - 1];
            const trendLine = latestTrend
                ? `Trend (${latestTrend.monthKey}): ${latestTrend.scheduledCount} sched, ${latestTrend.completedCount} done, ${latestTrend.activeCount} act, ${latestTrend.overdueCount} overdue, cost ${fmt(this.toNumber(latestTrend.maintenanceCost))}`
                : '';
            const anomaliesText = [
                ...(anomalies.repeatedFailures || []).slice(0, 3).map((r) => `${r.vehiclePlate} has ${r.incidentCount} ${r.maintenanceTitle}`),
                ...(anomalies.missingDates || []).slice(0, 2).map((m) => `Missing date: ${m.vehiclePlate} (${m.maintenanceTitle})`),
            ].join('; ');
            const trendsText = (trends.topTypes || []).map((t) => `${t.maintenanceTitle} (${t.count})`).join(', ');
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
            return this.geminiAiService.generateGeminiText(prompt);
        });
    }
    async getReport() {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const [statusBreakdown, monthlyTrend, vehiclesResult, alertsResult, schedules] = await Promise.all([
                this.query(connection, `SELECT status, scheduleCount, percentage
             FROM maintenance_status_summary ORDER BY status`),
                this.query(connection, `SELECT monthKey, scheduledCount, completedCount, activeCount,
                    overdueCount, maintenanceCost
             FROM maintenance_monthly_trend ORDER BY monthKey`),
                this.getVehicleKpis(),
                this.getAlerts(),
                this.query(connection, `SELECT scheduleId, vehiclePlate, maintenanceTitle, triggerType,
                    intervalType, assignedMechanic, scheduleStatus,
                    odometerReading, CAST(nextDueDate AS VARCHAR) AS nextDueDate
             FROM maintenance_schedule_summary
             ORDER BY nextDueDate NULLS LAST, maintenanceTitle`),
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
    toNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value.replace(/[^0-9.-]/g, ''));
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }
    async getSnapshot(connection) {
        const rows = await this.query(connection, `SELECT snapshotKey,
              CAST(generatedAt AS VARCHAR) AS generatedAt,
              CAST(sourceMaxUpdatedAt AS VARCHAR) AS sourceMaxUpdatedAt,
              totalVehicles, availableVehicles, underMaintenanceVehicles,
              underRepairVehicles, totalSchedules, pendingSchedules,
              dueSchedules, inProgressSchedules, completedSchedules,
              overdueSchedules, cancelledSchedules, dueWithin7Days,
              activeMaintenanceVehicles, averageOdometer,
              totalMaintenanceCost, completionRate, fleetPerformance
       FROM analytics_snapshot WHERE snapshotKey = 'current'`);
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
    dataSourceMetadata(snapshot) {
        const generatedAt = String(snapshot['generatedAt']);
        const generatedTime = Date.parse(generatedAt);
        const maxAgeMinutes = this.positiveNumber(process.env['ANALYTICS_MAX_AGE_MINUTES'], 1440);
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
    positiveNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }
    async query(connection, sql) {
        return this.dataMartService.query(sql);
    }
    async withDataMart(action) {
        try {
            const connection = await this.dataMartService.getConnection();
            return await action(connection);
        }
        catch (error) {
            if (error instanceof common_1.ServiceUnavailableException)
                throw error;
            console.error('[AnalyticsDataMart] DuckDB query failed', error);
            throw new common_1.ServiceUnavailableException('Prepared analytics are unavailable. Run npm run migrate and try again.');
        }
    }
    async onModuleDestroy() {
        await this.dataMartService.onModuleDestroy();
    }
    resetConnection() {
        this.dataMartService.resetConnection().catch(() => undefined);
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [duckdb_datamart_service_1.DuckDbDataMartService,
        gemini_ai_service_1.GeminiAiService,
        vehicle_kpi_service_1.VehicleKpiService,
        work_order_analytics_service_1.WorkOrderAnalyticsService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map