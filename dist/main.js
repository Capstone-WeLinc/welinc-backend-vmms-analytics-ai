/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const dotenv_1 = __importDefault(__webpack_require__(1));
const core_1 = __webpack_require__(2);
const app_module_1 = __webpack_require__(3);
dotenv_1.default.config();
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('analytics', {
        exclude: ['maintenance-schedules/search'],
    });
    app.enableCors();
    await app.listen(process.env.PORT ?? 3001);
}
bootstrap();


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("dotenv");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const common_1 = __webpack_require__(4);
const analytics_controller_1 = __webpack_require__(5);
const analytics_service_1 = __webpack_require__(6);
const dashboard_controller_1 = __webpack_require__(11);
const maintenance_schedules_controller_1 = __webpack_require__(12);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [analytics_controller_1.AnalyticsController, dashboard_controller_1.DashboardController, maintenance_schedules_controller_1.MaintenanceSchedulesController],
        providers: [analytics_service_1.AnalyticsService],
    })
], AppModule);


/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 5 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AnalyticsController = void 0;
const common_1 = __webpack_require__(4);
const analytics_service_1 = __webpack_require__(6);
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    getHealth() {
        return this.analyticsService.getHealth();
    }
    async getOverview() {
        const [overview, forecast, anomalies, trends] = await Promise.all([
            this.analyticsService.getOverview(),
            this.analyticsService.getPredictiveForecast(),
            this.analyticsService.getAnomalies(),
            this.analyticsService.getExpandedTrends(),
        ]);
        return { ...overview, forecast, anomalies, trends };
    }
    async getOverviewLegacy() {
        const [overview, forecast, anomalies, trends] = await Promise.all([
            this.analyticsService.getOverview(),
            this.analyticsService.getPredictiveForecast(),
            this.analyticsService.getAnomalies(),
            this.analyticsService.getExpandedTrends(),
        ]);
        return { ...overview, forecast, anomalies, trends };
    }
    getVehicleKpis() {
        return this.analyticsService.getVehicleKpis();
    }
    getVehicleKpisLegacy() {
        return this.analyticsService.getVehicleKpis();
    }
    async getAiInsights() {
        const aiSummary = await this.analyticsService.getAiInsights();
        return { aiSummary };
    }
    async getAiInsightsLegacy() {
        const aiSummary = await this.analyticsService.getAiInsights();
        return { aiSummary };
    }
    getAlerts() {
        return this.analyticsService.getAlerts();
    }
    getAlertsLegacy() {
        return this.analyticsService.getAlerts();
    }
    getReport() {
        return this.analyticsService.getReport();
    }
    getReportLegacy() {
        return this.analyticsService.getReport();
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('analytics/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getOverviewLegacy", null);
__decorate([
    (0, common_1.Get)('vehicles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getVehicleKpis", null);
__decorate([
    (0, common_1.Get)('analytics/vehicles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getVehicleKpisLegacy", null);
__decorate([
    (0, common_1.Get)('insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAiInsights", null);
__decorate([
    (0, common_1.Get)('analytics/insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAiInsightsLegacy", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Get)('analytics/alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAlertsLegacy", null);
__decorate([
    (0, common_1.Get)('report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('analytics/report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getReportLegacy", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof analytics_service_1.AnalyticsService !== "undefined" && analytics_service_1.AnalyticsService) === "function" ? _a : Object])
], AnalyticsController);


/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AnalyticsService = void 0;
const promises_1 = __webpack_require__(7);
const node_path_1 = __importDefault(__webpack_require__(8));
const common_1 = __webpack_require__(4);
const node_api_1 = __webpack_require__(9);
let AnalyticsService = class AnalyticsService {
    databasePath = this.resolveDatabasePath();
    instance = null;
    connection = null;
    connecting = null;
    /** AI insights cache to minimize Gemini API calls (free-tier quota is very limited) */
    aiInsightsCache = null;
    AI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
    constructor() {
        console.log('[AnalyticsDataMart] Starting service');
        console.log('[AnalyticsDataMart] current working directory:', process.cwd());
        console.log('[AnalyticsDataMart] resolved DuckDB path:', this.databasePath);
    }
    resolveDatabasePath() {
        const configuredPath = process.env['DUCKDB_PATH']?.trim();
        if (configuredPath) {
            return node_path_1.default.resolve(configuredPath);
        }
        const candidates = [
            node_path_1.default.resolve(process.cwd(), 'database', 'vmms_datamart.duckdb'),
            node_path_1.default.resolve(process.cwd(), '..', 'database', 'vmms_datamart.duckdb'),
            node_path_1.default.resolve(process.cwd(), '..', '..', 'database', 'vmms_datamart.duckdb'),
            node_path_1.default.resolve(process.cwd(), '..', 'vmms-backend', 'database', 'vmms_datamart.duckdb'),
            node_path_1.default.resolve(process.cwd(), '..', 'welinc-backend-vmms', 'database', 'vmms_datamart.duckdb'),
            node_path_1.default.resolve(process.cwd(), '..', 'welinc-backend-vmms-analytics-ai', 'database', 'vmms_datamart.duckdb'),
        ];
        for (const candidate of candidates) {
            try {
                const { accessSync } = __webpack_require__(10);
                accessSync(candidate);
                return candidate;
            }
            catch {
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
    calculateRiskScore(vehicle) {
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
    getRiskLevel(score) {
        if (score > 70)
            return 'HIGH';
        if (score >= 40)
            return 'MEDIUM';
        return 'LOW';
    }
    async getVehicleKpis() {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const vehicles = await this.query(connection, `SELECT vehicleId, plateNumber, vehicleModel, vehicleStatus,
                currentOdometer, totalSchedules, activeSchedules,
                completedSchedules, overdueSchedules, dueWithin7Days,
                maintenanceCost, completionRate,
                CAST(latestMaintenanceDate AS VARCHAR) AS latestMaintenanceDate,
                CAST(nextDueDate AS VARCHAR) AS nextDueDate, riskLevel
         FROM vehicle_maintenance_kpi
         ORDER BY CASE riskLevel WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                  plateNumber`);
            const vehiclesWithRiskReason = (vehicles || []).map((vehicle) => {
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
                const levelWeight = (lvl) => lvl === 'HIGH' ? 1 : lvl === 'MEDIUM' ? 2 : 3;
                const diff = levelWeight(a.riskLevel) - levelWeight(b.riskLevel);
                if (diff !== 0)
                    return diff;
                return a.plateNumber.localeCompare(b.plateNumber);
            });
            return { dataSource: this.dataSourceMetadata(snapshot), vehicles: vehiclesWithRiskReason };
        });
    }
    buildVehicleRiskReason(vehicle) {
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
        const parts = [];
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
    async getAlerts() {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const alerts = await this.query(connection, `SELECT a.alertId, a.scheduleId, a.vehiclePlate, a.severity, a.alertType,
                a.maintenanceTitle, a.message, a.recommendedAction,
                CAST(a.dueDate AS VARCHAR) AS dueDate,
                CAST(a.generatedAt AS VARCHAR) AS generatedAt,
                k.totalSchedules, k.activeSchedules, k.completedSchedules, k.overdueSchedules,
                k.dueWithin7Days, k.completionRate, CAST(k.nextDueDate AS VARCHAR) AS nextDueDate,
                k.vehicleStatus, k.riskLevel as rawRiskLevel
         FROM maintenance_alerts a
         LEFT JOIN vehicle_maintenance_kpi k ON a.vehiclePlate = k.plateNumber
         ORDER BY a.dueDate NULLS LAST, a.vehiclePlate`);
            const normalizedAlerts = alerts.map((alert) => {
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
                const s = (sev) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
                return s(a.severity) - s(b.severity);
            });
            return { dataSource: this.dataSourceMetadata(snapshot), alerts: normalizedAlerts };
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
    async getReport() {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const [statusBreakdown, monthlyTrend, vehicles, alerts, schedules] = await Promise.all([
                this.query(connection, `SELECT status, scheduleCount, percentage
             FROM maintenance_status_summary ORDER BY status`),
                this.query(connection, `SELECT monthKey, scheduledCount, completedCount, activeCount,
                    overdueCount, maintenanceCost
             FROM maintenance_monthly_trend ORDER BY monthKey`),
                this.query(connection, `SELECT vehicleId, plateNumber, vehicleModel, vehicleStatus,
                    currentOdometer, totalSchedules, activeSchedules,
                    completedSchedules, overdueSchedules, dueWithin7Days,
                    maintenanceCost, completionRate,
                    CAST(latestMaintenanceDate AS VARCHAR) AS latestMaintenanceDate,
                    CAST(nextDueDate AS VARCHAR) AS nextDueDate, riskLevel
             FROM vehicle_maintenance_kpi ORDER BY plateNumber`),
                this.query(connection, `SELECT a.alertId, a.scheduleId, a.vehiclePlate, a.severity, a.alertType,
                    a.maintenanceTitle, a.message, a.recommendedAction,
                    CAST(a.dueDate AS VARCHAR) AS dueDate,
                    CAST(a.generatedAt AS VARCHAR) AS generatedAt,
                    k.totalSchedules, k.activeSchedules, k.completedSchedules, k.overdueSchedules,
                    k.dueWithin7Days, k.completionRate, CAST(k.nextDueDate AS VARCHAR) AS nextDueDate,
                    k.vehicleStatus, k.riskLevel as rawRiskLevel
             FROM maintenance_alerts a
             LEFT JOIN vehicle_maintenance_kpi k ON a.vehiclePlate = k.plateNumber
             ORDER BY a.dueDate NULLS LAST`),
                this.query(connection, `SELECT scheduleId, vehiclePlate, maintenanceTitle, triggerType,
                    intervalType, assignedMechanic, scheduleStatus,
                    odometerReading, CAST(nextDueDate AS VARCHAR) AS nextDueDate
             FROM maintenance_schedule_summary
             ORDER BY nextDueDate NULLS LAST, maintenanceTitle`),
            ]);
            const normalizedVehicles = vehicles.map((vehicle) => {
                const riskScore = this.calculateRiskScore(vehicle);
                const computedRiskLevel = this.getRiskLevel(riskScore);
                const updatedVehicle = { ...vehicle, riskScore, riskLevel: computedRiskLevel };
                return {
                    ...updatedVehicle,
                    riskReason: this.buildVehicleRiskReason(updatedVehicle),
                };
            }).sort((a, b) => {
                const s = (sev) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
                const diff = s(a.riskLevel) - s(b.riskLevel);
                if (diff !== 0)
                    return diff;
                return a.plateNumber.localeCompare(b.plateNumber);
            });
            const normalizedAlerts = alerts.map((alert) => {
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
                const s = (sev) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
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
        // Return cached response if fresh (protects free-tier quota)
        if (this.aiInsightsCache &&
            Date.now() - this.aiInsightsCache.timestamp < this.AI_CACHE_TTL_MS) {
            return this.aiInsightsCache.text;
        }
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
        try {
            const result = await this.generateGeminiText(prompt);
            this.aiInsightsCache = { text: result, timestamp: Date.now() };
            return result;
        }
        catch (error) {
            const errorDetails = error instanceof Error
                ? error.message || String(error)
                : JSON.stringify(error);
            if (error instanceof common_1.HttpException) {
                const status = error.getStatus();
                if (status === common_1.HttpStatus.TOO_MANY_REQUESTS ||
                    status === common_1.HttpStatus.SERVICE_UNAVAILABLE) {
                    console.warn('[AnalyticsDataMart] Gemini AI unavailable. Returning fallback AI summary.', errorDetails);
                    return 'AI insights are currently unavailable because the Gemini service is not available. Please try again later.';
                }
            }
            console.error('[AnalyticsDataMart] Unexpected Gemini error in getAiInsights', errorDetails);
            return 'AI insights are currently unavailable due to an internal service error. Please try again later.';
        }
    }
    getGeminiConfig() {
        const apiKey = process.env['GEMINI_API_KEY']?.trim();
        if (!apiKey) {
            throw new common_1.ServiceUnavailableException('Gemini API key is required for AI analytics. Set GEMINI_API_KEY in .env.');
        }
        const apiBaseUrl = (process.env['GEMINI_API_URL']?.trim() ||
            'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
        const model = (process.env['GEMINI_MODEL']?.trim() || 'gemini-flash-latest').replace(/^models\//, '');
        return { apiKey, apiBaseUrl, model };
    }
    async generateGeminiText(prompt) {
        const { apiKey, apiBaseUrl, model } = this.getGeminiConfig();
        // Only use models confirmed to have free-tier quota available
        const modelCandidates = [
            model,
            'gemini-flash-latest',
            'gemini-flash-lite-latest',
        ].filter((candidate, index, arr) => candidate && arr.indexOf(candidate) === index);
        let lastError = null;
        for (const candidateModel of modelCandidates) {
            try {
                return await this.generateGeminiTextForModel(prompt, apiKey, apiBaseUrl, candidateModel);
            }
            catch (error) {
                const details = error instanceof Error ? error.message : String(error);
                console.warn(`[AnalyticsDataMart] Gemini model ${candidateModel} failed, trying next fallback model.`, details);
                if (error instanceof common_1.HttpException &&
                    error.getStatus() === common_1.HttpStatus.TOO_MANY_REQUESTS) {
                    lastError = error;
                    continue;
                }
                if (error instanceof common_1.ServiceUnavailableException &&
                    details.includes('HTTP 404')) {
                    lastError = error;
                    continue;
                }
                throw error;
            }
        }
        if (lastError) {
            throw lastError;
        }
        throw new common_1.ServiceUnavailableException('Gemini API failed: no available model succeeded. Please verify your API key and account quota.');
    }
    async generateGeminiTextForModel(prompt, apiKey, apiBaseUrl, model) {
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
        };
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
        const errors = [];
        let successfulResponse = null;
        let lastErrorResponse = null;
        let preservedQuotaErrorResponse = null;
        let allowFallback = true;
        const attemptRequest = async (request) => {
            const response = await fetch(request.endpoint, { ...requestOptions, body: request.body });
            const responseText = await response.text();
            let parsed = null;
            try {
                parsed = JSON.parse(responseText);
            }
            catch {
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
            const errorAttempt = {
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
            const errorResponse = preservedQuotaErrorResponse ?? lastErrorResponse;
            if (errorResponse !== null) {
                const resolvedErrorResponse = errorResponse;
                const rawErrorMessage = resolvedErrorResponse.payload?.error?.message ?? resolvedErrorResponse.body;
                const errorMessage = rawErrorMessage?.toString().trim() ||
                    `HTTP ${resolvedErrorResponse.status} at ${resolvedErrorResponse.endpoint} returned no details`;
                if (resolvedErrorResponse.status === 429 ||
                    resolvedErrorResponse.payload?.error?.status === 'RESOURCE_EXHAUSTED') {
                    throw new common_1.HttpException(`Gemini quota exceeded: ${errorMessage}`, common_1.HttpStatus.TOO_MANY_REQUESTS);
                }
                throw new common_1.ServiceUnavailableException(`Gemini API failed: ${errorMessage}`);
            }
            throw new common_1.ServiceUnavailableException(`Gemini API was unreachable. Check GEMINI_API_URL and network connectivity. Tried endpoints: ${errors.join(', ')}`);
        }
        const successful = successfulResponse;
        const payload = successful.payload;
        if (!payload) {
            throw new common_1.ServiceUnavailableException(`Gemini API returned non-JSON response (${successful.status}).`);
        }
        const output = this.extractGeminiTextOutput(payload)?.trim();
        if (!output) {
            throw new common_1.ServiceUnavailableException('Gemini API returned no output.');
        }
        return output;
    }
    extractGeminiTextOutput(payload) {
        const candidate = payload?.candidates?.[0];
        if (!candidate)
            return null;
        if (typeof candidate.output === 'string' && candidate.output.trim()) {
            return candidate.output;
        }
        const content = candidate.content;
        if (!content)
            return null;
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
                .map((part) => part?.text ?? (typeof part === 'string' ? part : ''))
                .filter((part) => typeof part === 'string' && part.length > 0)
                .join(' ')
                .trim() || null;
        }
        return null;
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
        const reader = await connection.runAndReadAll(sql);
        return reader
            .getRowObjectsJS()
            .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
            key,
            typeof value === 'bigint' ? Number(value) : value,
        ])));
    }
    async withDataMart(action) {
        try {
            const connection = await this.getConnection();
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
        this.connection?.closeSync();
        this.connection = null;
        this.instance = null;
    }
    async getConnection() {
        if (this.connection) {
            return this.connection;
        }
        if (this.connecting) {
            return await this.connecting;
        }
        this.connecting = (async () => {
            try {
                await (0, promises_1.mkdir)(node_path_1.default.dirname(this.databasePath), { recursive: true });
                await (0, promises_1.access)(this.databasePath).catch(() => undefined);
                this.instance = await node_api_1.DuckDBInstance.create(this.databasePath);
                this.connection = await this.instance.connect();
                await this.ensurePreparedData(this.connection);
                return this.connection;
            }
            catch (error) {
                this.connection?.closeSync();
                this.connection = null;
                this.instance = null;
                throw error;
            }
            finally {
                this.connecting = null;
            }
        })();
        return await this.connecting;
    }
    async ensurePreparedData(connection) {
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
        const snapshotCount = await this.query(connection, "SELECT COUNT(*) AS rowCount FROM analytics_snapshot");
        // Data should be natively populated by the main service or ETL. 
        // If rowCount is 0, we simply return empty analytics via getSnapshot() instead of mocking.
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AnalyticsService);


/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("node:fs/promises");

/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("node:path");

/***/ }),
/* 9 */
/***/ ((module) => {

module.exports = require("@duckdb/node-api");

/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("node:fs");

/***/ }),
/* 11 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DashboardController = void 0;
const common_1 = __webpack_require__(4);
const analytics_service_1 = __webpack_require__(6);
let DashboardController = class DashboardController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getDashboardPage(res) {
        const [overview, alerts, vehicleKpis, forecast, anomalies, trends, aiSummary] = await Promise.all([
            this.analyticsService.getOverview(),
            this.analyticsService.getAlerts(),
            this.analyticsService.getVehicleKpis(),
            this.analyticsService.getPredictiveForecast(),
            this.analyticsService.getAnomalies(),
            this.analyticsService.getExpandedTrends(),
            this.analyticsService.getAiInsights(),
        ]);
        function fmtNumber(n) {
            if (n === null || n === undefined || Number.isNaN(n))
                return 'n/a';
            return Intl.NumberFormat('en-US').format(n);
        }
        function fmtPercent(n) {
            if (n === null || n === undefined || Number.isNaN(n))
                return 'n/a';
            return `${Number(n).toFixed(1)}%`;
        }
        function fmtDate(d) {
            if (!d)
                return 'n/a';
            try {
                const dt = new Date(String(d));
                return dt.toLocaleString();
            }
            catch {
                return String(d);
            }
        }
        const summaryMetrics = overview?.summaryMetrics ?? {};
        const alertCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, OTHER: 0 };
        for (const item of alerts?.alerts || []) {
            const severity = String(item.severity ?? 'OTHER').toUpperCase();
            alertCounts[severity] = (alertCounts[severity] ?? 0) + 1;
        }
        const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, OTHER: 0 };
        for (const item of vehicleKpis?.vehicles || []) {
            const risk = String(item.riskLevel ?? 'OTHER').toUpperCase();
            riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
        }
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Maintenance Scheduling Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
      .wrap { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .card { background: #111827; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 10px; border-bottom: 1px solid #334155; text-align: left; }
      .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85em; }
      .badge.HIGH { background: #7f1d1d; color: #fca5a5; }
      .badge.MEDIUM { background: #78350f; color: #fcd34d; }
      .badge.LOW { background: #14532d; color: #86efac; }
      .anomaly { border-left: 4px solid #f59e0b; padding-left: 12px; margin-bottom: 8px; background: #1e293b; padding: 12px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Maintenance Scheduling Dashboard</h1>
      <p>Maintenance scheduling insights generated from the VMMS analytics data mart.</p>
      
      <div class="grid">
        <div class="card">
          <h2>Snapshot</h2>
          <p><strong>Total Vehicles:</strong> ${fmtNumber(overview?.snapshot?.totalVehicles)}</p>
          <p><strong>Completion Rate:</strong> ${fmtPercent(overview?.snapshot?.completionRate)}</p>
          <p><strong>Total Maintenance Cost:</strong> ${fmtNumber(overview?.snapshot?.totalMaintenanceCost)}</p>
          <p><strong>Snapshot Generated:</strong> ${fmtDate(overview?.snapshot?.generatedAt)}</p>
        </div>
        <div class="card">
          <h3>Predictive Forecast</h3>
          <p>Vehicles expected to require maintenance:</p>
          <ul>
            <li><strong>Next 7 Days:</strong> ${fmtNumber(forecast?.dueIn7Days)}</li>
            <li><strong>Next 30 Days:</strong> ${fmtNumber(forecast?.dueIn30Days)}</li>
            <li><strong>Next 90 Days:</strong> ${fmtNumber(forecast?.dueIn90Days)}</li>
          </ul>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Maintenance Status</h3>
          <ul>
            ${(overview?.statusBreakdown || []).map((item) => `<li>${item.status}: ${fmtNumber(item.scheduleCount)} (${fmtPercent(item.percentage)})</li>`).join('')}
          </ul>
        </div>
        <div class="card">
          <h3>Expanded Trends</h3>
          <p><strong>Most Common Maintenance Types:</strong></p>
          <ul>
            ${(trends?.topTypes || []).map((item) => `<li>${item.maintenanceTitle}: ${fmtNumber(item.count)} schedules</li>`).join('')}
          </ul>
        </div>
      </div>

      ${anomalies?.repeatedFailures?.length || anomalies?.missingDates?.length ? `
      <div class="card">
        <h3>Anomalies Detected</h3>
        ${(anomalies?.repeatedFailures || []).map((r) => `
          <div class="anomaly">
            <strong>Repeated Failure:</strong> Vehicle ${r.vehiclePlate} has ${r.incidentCount} instances of "${r.maintenanceTitle}".
          </div>
        `).join('')}
        ${(anomalies?.missingDates || []).map((m) => `
          <div class="anomaly">
            <strong>Data Integrity:</strong> Schedule ID ${m.scheduleId} (${m.maintenanceTitle}) for Vehicle ${m.vehiclePlate} is missing a next due date.
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="card">
        <h3>Maintenance Scheduling Insights</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.5; color: #a5b4fc;">${this.escapeHtml(aiSummary)}</pre>
      </div>

      <div class="card">
        <h3>Vehicle KPIs & Risk Analysis</h3>
        <p style="margin-top: 0.5rem; margin-bottom: 1rem; color: #94a3b8; font-size: 0.95rem;">
          Risk is calculated dynamically via a 0-100 score based on overdue workload, missing schedule dates, and completion rates.
        </p>
        <table>
          <thead>
            <tr><th>Plate</th><th>Risk</th><th>Score</th><th>Reason</th><th>Active</th><th>Overdue</th><th>Next Due</th><th>Completion</th></tr>
          </thead>
          <tbody>
            ${(vehicleKpis?.vehicles || []).slice(0, 10).map((vehicle) => `
              <tr>
                <td>${vehicle.plateNumber || 'n/a'}</td>
                <td><span class="badge ${vehicle.riskLevel || 'OTHER'}">${vehicle.riskLevel || 'n/a'}</span></td>
                <td><strong>${vehicle.riskScore ?? 'n/a'}</strong></td>
                <td>${vehicle.riskReason || 'n/a'}</td>
                <td>${fmtNumber(vehicle.activeSchedules ?? 0)}</td>
                <td>${fmtNumber(vehicle.overdueSchedules ?? 0)}</td>
                <td>${fmtDate(vehicle.nextDueDate)}</td>
                <td>${fmtPercent(vehicle.completionRate)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardPage", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [typeof (_a = typeof analytics_service_1.AnalyticsService !== "undefined" && analytics_service_1.AnalyticsService) === "function" ? _a : Object])
], DashboardController);


/***/ }),
/* 12 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MaintenanceSchedulesController = void 0;
const common_1 = __webpack_require__(4);
const analytics_service_1 = __webpack_require__(6);
let MaintenanceSchedulesController = class MaintenanceSchedulesController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    searchSchedules(query, limit = '6') {
        return this.analyticsService.searchMaintenanceSchedules(query, limit);
    }
};
exports.MaintenanceSchedulesController = MaintenanceSchedulesController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MaintenanceSchedulesController.prototype, "searchSchedules", null);
exports.MaintenanceSchedulesController = MaintenanceSchedulesController = __decorate([
    (0, common_1.Controller)('maintenance-schedules'),
    __metadata("design:paramtypes", [typeof (_a = typeof analytics_service_1.AnalyticsService !== "undefined" && analytics_service_1.AnalyticsService) === "function" ? _a : Object])
], MaintenanceSchedulesController);


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	
/******/ })()
;