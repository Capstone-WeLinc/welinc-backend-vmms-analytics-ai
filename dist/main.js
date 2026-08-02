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
        exclude: ['maintenance-schedules/search', 'maintenance-schedules/(.*)'],
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
const sync_service_1 = __webpack_require__(13);
const duckdb_datamart_service_1 = __webpack_require__(7);
const maintenance_schedules_controller_1 = __webpack_require__(17);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [analytics_controller_1.AnalyticsController, maintenance_schedules_controller_1.MaintenanceSchedulesController],
        providers: [duckdb_datamart_service_1.DuckDbDataMartService, analytics_service_1.AnalyticsService, sync_service_1.SyncService],
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AnalyticsController = void 0;
const common_1 = __webpack_require__(4);
const analytics_service_1 = __webpack_require__(6);
const sync_service_1 = __webpack_require__(13);
let AnalyticsController = class AnalyticsController {
    analyticsService;
    syncService;
    constructor(analyticsService, syncService) {
        this.analyticsService = analyticsService;
        this.syncService = syncService;
    }
    async triggerSync() {
        return this.syncService.syncNow();
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
    getWorkOrders() {
        return this.analyticsService.getWorkOrderSummary();
    }
    getWorkOrdersLegacy() {
        return this.analyticsService.getWorkOrderSummary();
    }
    getMechanicWorkload() {
        return this.analyticsService.getMechanicWorkload();
    }
    getMechanicWorkloadLegacy() {
        return this.analyticsService.getMechanicWorkload();
    }
    async getWorkOrderAiInsights() {
        const aiSummary = await this.analyticsService.getWorkOrderAiInsights();
        return { aiSummary };
    }
    async getWorkOrderAiInsightsLegacy() {
        const aiSummary = await this.analyticsService.getWorkOrderAiInsights();
        return { aiSummary };
    }
    getWorkOrderList(mechanic, status, limit) {
        return this.analyticsService.getScheduleWorkOrders(mechanic, status, limit);
    }
    getWorkOrderListLegacy(mechanic, status, limit) {
        return this.analyticsService.getScheduleWorkOrders(mechanic, status, limit);
    }
    getWorkOrderItem(id) {
        return this.analyticsService.getWorkOrderById(id);
    }
    getWorkOrderItemLegacy(id) {
        return this.analyticsService.getWorkOrderById(id);
    }
    getWorkOrderRecommendations(id, title, vehicle) {
        return this.analyticsService.getWorkOrderRecommendations(id, title, vehicle);
    }
    getWorkOrderRecommendationsLegacy(id, title, vehicle) {
        return this.analyticsService.getWorkOrderRecommendations(id, title, vehicle);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.Post)('analytics/sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "triggerSync", null);
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
__decorate([
    (0, common_1.Get)('workorders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrders", null);
__decorate([
    (0, common_1.Get)('analytics/workorders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrdersLegacy", null);
__decorate([
    (0, common_1.Get)('workorders/mechanics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getMechanicWorkload", null);
__decorate([
    (0, common_1.Get)('analytics/workorders/mechanics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getMechanicWorkloadLegacy", null);
__decorate([
    (0, common_1.Get)('workorders/ai-insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getWorkOrderAiInsights", null);
__decorate([
    (0, common_1.Get)('analytics/workorders/ai-insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getWorkOrderAiInsightsLegacy", null);
__decorate([
    (0, common_1.Get)('workorders/list'),
    __param(0, (0, common_1.Query)('mechanic')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrderList", null);
__decorate([
    (0, common_1.Get)('analytics/workorders/list'),
    __param(0, (0, common_1.Query)('mechanic')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrderListLegacy", null);
__decorate([
    (0, common_1.Get)('workorders/item/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrderItem", null);
__decorate([
    (0, common_1.Get)('analytics/workorders/item/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrderItemLegacy", null);
__decorate([
    (0, common_1.Get)('workorders/recommendations/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('title')),
    __param(2, (0, common_1.Query)('vehicle')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrderRecommendations", null);
__decorate([
    (0, common_1.Get)('analytics/workorders/recommendations/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('title')),
    __param(2, (0, common_1.Query)('vehicle')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getWorkOrderRecommendationsLegacy", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof analytics_service_1.AnalyticsService !== "undefined" && analytics_service_1.AnalyticsService) === "function" ? _a : Object, typeof (_b = typeof sync_service_1.SyncService !== "undefined" && sync_service_1.SyncService) === "function" ? _b : Object])
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AnalyticsService = void 0;
const common_1 = __webpack_require__(4);
const duckdb_datamart_service_1 = __webpack_require__(7);
let AnalyticsService = class AnalyticsService {
    dataMartService;
    /** AI insights cache to minimize Gemini API calls (free-tier quota is very limited) */
    aiInsightsCache = null;
    AI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
    /** Shared in-flight promise — concurrent callers await the same Gemini call */
    aiInsightsBuildPromise = null;
    constructor(dataMartService) {
        this.dataMartService = dataMartService;
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
    // ─── Work Order / Mechanic Analytics ───────────────────────────────────────
    workOrderAiCache = null;
    workOrderAiBuildPromise = null;
    async getWorkOrderSummary() {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const [statusBreakdown, mechanicWorkload, timeline, topTypes, costBreakdown] = await Promise.all([
                // Status distribution
                this.query(connection, `SELECT scheduleStatus AS status,
                  CAST(COUNT(*) AS INTEGER) AS workOrderCount,
                  CAST(ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS DOUBLE) AS percentage,
                  CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost
           FROM maintenance_schedule_summary
           GROUP BY scheduleStatus
           ORDER BY CASE scheduleStatus
             WHEN 'PENDING' THEN 1 WHEN 'DUE' THEN 2 WHEN 'IN_PROGRESS' THEN 3
             WHEN 'COMPLETED' THEN 4 WHEN 'OVERDUE' THEN 5 WHEN 'CANCELLED' THEN 6
             ELSE 7 END`),
                // Mechanic workload with cost
                this.getMechanicWorkload(),
                // Monthly timeline
                this.getWorkOrderTimeline(),
                // Top maintenance types by frequency
                this.query(connection, `SELECT maintenanceTitle AS type,
                  CAST(COUNT(*) AS INTEGER) AS count,
                  CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
                  CAST(ROUND(AVG(totalCost), 2) AS DOUBLE) AS avgCost
           FROM maintenance_schedule_summary
           GROUP BY maintenanceTitle
           ORDER BY count DESC
           LIMIT 8`),
                // Overall cost breakdown
                this.query(connection, `SELECT
             CAST(ROUND(SUM(partsCost), 2) AS DOUBLE) AS totalPartsCost,
             CAST(ROUND(SUM(laborCost), 2) AS DOUBLE) AS totalLaborCost,
             CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
             CAST(ROUND(AVG(CASE WHEN totalCost > 0 THEN totalCost END), 2) AS DOUBLE) AS avgCostPerWorkOrder,
             CAST(COUNT(CASE WHEN totalCost > 0 THEN 1 END) AS INTEGER) AS workOrdersWithCost
           FROM maintenance_schedule_summary`),
            ]);
            const totals = statusBreakdown.reduce((acc, row) => {
                acc[String(row.status)] = this.toNumber(row.workOrderCount);
                return acc;
            }, {});
            const costs = costBreakdown[0] ?? {};
            return {
                dataSource: this.dataSourceMetadata(snapshot),
                summary: {
                    totalWorkOrders: Object.values(totals).reduce((s, v) => s + v, 0),
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
            const rows = await this.query(connection, `SELECT
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
         ORDER BY overdue DESC, totalAssigned DESC`);
            return rows.map((row) => ({
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
            const rows = await this.query(connection, `SELECT
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
         LIMIT 12`);
            return rows;
        });
    }
    async getScheduleWorkOrders(mechanic, status, limit = '100') {
        return this.withDataMart(async (connection) => {
            const snapshot = await this.getSnapshot(connection);
            const conditions = [];
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
            const rows = await this.query(connection, `SELECT
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
         LIMIT ${max}`);
            const now = Date.now();
            const workOrders = rows.map((r) => {
                const createdTime = r.createdAt ? Date.parse(r.createdAt) : now;
                const dueTime = r.nextDueDate ? Date.parse(r.nextDueDate) : null;
                const daysOpen = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
                const daysOverdue = dueTime && now > dueTime && r.status !== 'COMPLETED'
                    ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24))
                    : 0;
                const priority = r.status === 'OVERDUE' || daysOverdue > 0
                    ? 'HIGH'
                    : (r.odometerReading ?? 0) > 100000 || r.triggerType === 'ODOMETER'
                        ? 'MEDIUM'
                        : 'NORMAL';
                const statusLabel = r.status === 'COMPLETED'
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
    async getWorkOrderById(id) {
        return this.withDataMart(async (connection) => {
            const escaped = id.trim().replace(/'/g, "''");
            const rows = await this.query(connection, `SELECT
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
         WHERE scheduleId = '${escaped}'`);
            if (!rows[0]) {
                throw new common_1.NotFoundException(`Work order schedule with ID ${id} not found.`);
            }
            const r = rows[0];
            const now = Date.now();
            const createdTime = r.createdAt ? Date.parse(r.createdAt) : now;
            const dueTime = r.nextDueDate ? Date.parse(r.nextDueDate) : null;
            const daysOpen = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
            const daysOverdue = dueTime && now > dueTime && r.status !== 'COMPLETED'
                ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24))
                : 0;
            const priority = r.status === 'OVERDUE' || daysOverdue > 0
                ? 'HIGH'
                : (r.odometerReading ?? 0) > 100000 || r.triggerType === 'ODOMETER'
                    ? 'MEDIUM'
                    : 'NORMAL';
            const statusLabel = r.status === 'COMPLETED'
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
    async getWorkOrderRecommendations(id, customTitle, customVehicle) {
        let title = customTitle || 'Maintenance Work Order';
        let vehiclePlate = customVehicle || 'Vehicle';
        let workOrderData = null;
        try {
            const res = await this.getWorkOrderById(id);
            workOrderData = res.workOrder;
            title = workOrderData.maintenanceTitle || title;
            vehiclePlate = workOrderData.vehiclePlate || vehiclePlate;
        }
        catch {
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
        }
        catch (err) {
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
    async getScheduleWithAi(id) {
        return this.getWorkOrderRecommendations(id);
    }
    async getWorkOrderAiInsights() {
        const isFresh = this.workOrderAiCache &&
            Date.now() - this.workOrderAiCache.timestamp < this.AI_CACHE_TTL_MS;
        if (isFresh)
            return this.workOrderAiCache.text;
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
    async buildAndCacheWorkOrderAiInsights() {
        const summary = await this.getWorkOrderSummary();
        const s = summary.summary;
        const mechanics = summary.mechanicWorkload ?? [];
        const topTypes = summary.topMaintenanceTypes ?? [];
        const timeline = summary.timeline ?? [];
        const fmt = (n) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n}`;
        const topOverdue = mechanics
            .filter((m) => this.toNumber(m.overdue) > 0)
            .slice(0, 4)
            .map((m) => `${m.mechanic}: ${m.overdue} overdue (${m.overdueOver30Days} >30d), cost ${fmt(this.toNumber(m.totalCost))}, ${m.completionRate}% done`)
            .join('; ');
        const topByLoad = mechanics
            .slice(0, 4)
            .map((m) => `${m.mechanic}: ${m.totalAssigned} WOs (${m.inProgress} active, ${m.completed} done), cost ${fmt(this.toNumber(m.totalCost))}`)
            .join('; ');
        const topCostMechanics = [...mechanics]
            .sort((a, b) => this.toNumber(b.totalCost) - this.toNumber(a.totalCost))
            .slice(0, 3)
            .map((m) => `${m.mechanic}: ${fmt(this.toNumber(m.totalCost))} (avg ${fmt(this.toNumber(m.avgCostPerWorkOrder))}/WO)`)
            .join('; ');
        const topTypesList = topTypes
            .slice(0, 4)
            .map((t) => `${t.type}: ${t.count} WOs, ${fmt(this.toNumber(t.totalCost))} total (avg ${fmt(this.toNumber(t.avgCost))})`)
            .join('; ');
        const latestMonth = timeline.at(-1);
        const trendLine = latestMonth
            ? `${latestMonth.monthKey}: ${latestMonth.created} WOs, ${latestMonth.completed} done, ${latestMonth.overdue} overdue, cost ${fmt(this.toNumber(latestMonth.totalCost))}`
            : '';
        const mechanicCount = mechanics.filter((m) => m.mechanic !== 'Unassigned').length;
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
        }
        catch (error) {
            const errorDetails = error instanceof Error ? error.message || String(error) : JSON.stringify(error);
            console.error('[AnalyticsDataMart] Gemini error in getWorkOrderAiInsights', errorDetails);
            if (this.workOrderAiCache)
                return this.workOrderAiCache.text;
            return 'Work order AI insights are currently unavailable. Please try again later.';
        }
    }
    getDefaultChecklistSteps(title) {
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
        const isFresh = this.aiInsightsCache &&
            Date.now() - this.aiInsightsCache.timestamp < this.AI_CACHE_TTL_MS;
        // Return fresh cache immediately — no work needed.
        if (isFresh) {
            return this.aiInsightsCache.text;
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
    async buildAndCacheAiInsights() {
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
                    // Keep serving the stale cache rather than replacing with an error message
                    if (this.aiInsightsCache)
                        return this.aiInsightsCache.text;
                    return 'AI insights are currently unavailable because the Gemini service is not available. Please try again later.';
                }
            }
            console.error('[AnalyticsDataMart] Unexpected Gemini error in getAiInsights', errorDetails);
            if (this.aiInsightsCache)
                return this.aiInsightsCache.text;
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
    /**
     * Reset cached DuckDB connection in shared DuckDbDataMartService.
     */
    resetConnection() {
        this.dataMartService.resetConnection().catch(() => undefined);
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
    __metadata("design:paramtypes", [typeof (_a = typeof duckdb_datamart_service_1.DuckDbDataMartService !== "undefined" && duckdb_datamart_service_1.DuckDbDataMartService) === "function" ? _a : Object])
], AnalyticsService);


/***/ }),
/* 7 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DuckDbDataMartService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DuckDbDataMartService = void 0;
const promises_1 = __webpack_require__(8);
const node_path_1 = __importDefault(__webpack_require__(9));
const common_1 = __webpack_require__(4);
const node_api_1 = __webpack_require__(10);
const duckdb_1 = __webpack_require__(11);
let DuckDbDataMartService = DuckDbDataMartService_1 = class DuckDbDataMartService {
    logger = new common_1.Logger(DuckDbDataMartService_1.name);
    instance = null;
    connection = null;
    initializingPromise = null;
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
                const { accessSync } = __webpack_require__(12);
                accessSync(candidate);
                return candidate;
            }
            catch {
                // try next candidate
            }
        }
        return candidates[0] ?? duckdb_1.DEFAULT_DUCKDB_PATH;
    }
    async getConnection() {
        if (this.connection) {
            return this.connection;
        }
        if (this.instance) {
            this.connection = await this.instance.connect();
            return this.connection;
        }
        if (this.initializingPromise) {
            return await this.initializingPromise;
        }
        this.initializingPromise = (async () => {
            try {
                const dbPath = this.resolveDatabasePath();
                await (0, promises_1.mkdir)(node_path_1.default.dirname(dbPath), { recursive: true });
                this.logger.log(`Initializing DuckDB instance at: ${dbPath}`);
                this.instance = await node_api_1.DuckDBInstance.create(dbPath);
                this.connection = await this.instance.connect();
                await (0, duckdb_1.initializeDataMart)(this.connection);
                return this.connection;
            }
            catch (error) {
                this.connection?.closeSync();
                this.connection = null;
                this.instance = null;
                throw error;
            }
            finally {
                this.initializingPromise = null;
            }
        })();
        return await this.initializingPromise;
    }
    async query(sql) {
        const conn = await this.getConnection();
        const reader = await conn.runAndReadAll(sql);
        return reader
            .getRowObjectsJS()
            .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
            key,
            typeof value === 'bigint' ? Number(value) : value,
        ])));
    }
    async resetConnection() {
        try {
            this.connection?.closeSync();
        }
        catch { }
        this.connection = null;
    }
    async onModuleDestroy() {
        await this.resetConnection();
    }
};
exports.DuckDbDataMartService = DuckDbDataMartService;
exports.DuckDbDataMartService = DuckDbDataMartService = DuckDbDataMartService_1 = __decorate([
    (0, common_1.Injectable)()
], DuckDbDataMartService);


/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("node:fs/promises");

/***/ }),
/* 9 */
/***/ ((module) => {

module.exports = require("node:path");

/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("@duckdb/node-api");

/***/ }),
/* 11 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_DUCKDB_PATH = void 0;
exports.openDataMart = openDataMart;
exports.initializeDataMart = initializeDataMart;
exports.replaceVehicleSummary = replaceVehicleSummary;
exports.replaceMaintenanceScheduleSummary = replaceMaintenanceScheduleSummary;
exports.replacePreparedAnalytics = replacePreparedAnalytics;
exports.dataMartCount = dataMartCount;
exports.preparedAnalyticsCount = preparedAnalyticsCount;
const promises_1 = __webpack_require__(8);
const node_path_1 = __importDefault(__webpack_require__(9));
const node_api_1 = __webpack_require__(10);
exports.DEFAULT_DUCKDB_PATH = node_path_1.default.resolve(process.cwd(), 'database', 'vmms_datamart.duckdb');
async function openDataMart() {
    const databasePath = node_path_1.default.resolve(process.env['DUCKDB_PATH'] ?? exports.DEFAULT_DUCKDB_PATH);
    await (0, promises_1.mkdir)(node_path_1.default.dirname(databasePath), { recursive: true });
    const instance = await node_api_1.DuckDBInstance.create(databasePath);
    return instance.connect();
}
async function initializeDataMart(connection) {
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
      nextDueDate TIMESTAMPTZ,
      partsCost DOUBLE NOT NULL DEFAULT 0,
      laborCost DOUBLE NOT NULL DEFAULT 0,
      totalCost DOUBLE NOT NULL DEFAULT 0,
      createdAt TIMESTAMPTZ
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
    // ── Schema migrations: add new columns to existing tables ──────────────────
    // ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent — safe on every startup.
    await connection.run(`
    ALTER TABLE maintenance_schedule_summary ADD COLUMN IF NOT EXISTS partsCost DOUBLE DEFAULT 0;
    ALTER TABLE maintenance_schedule_summary ADD COLUMN IF NOT EXISTS laborCost DOUBLE DEFAULT 0;
    ALTER TABLE maintenance_schedule_summary ADD COLUMN IF NOT EXISTS totalCost DOUBLE DEFAULT 0;
    ALTER TABLE maintenance_schedule_summary ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ;
  `);
}
function placeholders(rowCount, columnCount, timestampIndexes) {
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
async function insertBatches(connection, table, columns, rows, valuesFor, timestampIndexes, batchSize = 500) {
    for (let start = 0; start < rows.length; start += batchSize) {
        const batch = rows.slice(start, start + batchSize);
        const values = batch.flatMap(valuesFor);
        await connection.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders(batch.length, columns.length, timestampIndexes)}`, values);
    }
}
async function replaceVehicleSummary(connection, rows) {
    await connection.run('DELETE FROM vehicle_summary');
    await insertBatches(connection, 'vehicle_summary', [
        'vehicleId',
        'plateNumber',
        'vehicleModel',
        'vehicleStatus',
        'currentOdometer',
        'totalMaintenanceSchedules',
        'latestMaintenanceDate',
    ], rows, (row) => [
        row.vehicleId,
        row.plateNumber,
        row.vehicleModel,
        row.vehicleStatus,
        row.currentOdometer,
        row.totalMaintenanceSchedules,
        row.latestMaintenanceDate?.toISOString() ?? null,
    ], new Set([6]));
}
async function replaceMaintenanceScheduleSummary(connection, rows) {
    await connection.run('DELETE FROM maintenance_schedule_summary');
    await insertBatches(connection, 'maintenance_schedule_summary', [
        'scheduleId',
        'vehiclePlate',
        'maintenanceTitle',
        'triggerType',
        'intervalType',
        'assignedMechanic',
        'scheduleStatus',
        'odometerReading',
        'nextDueDate',
        'partsCost',
        'laborCost',
        'totalCost',
        'createdAt',
    ], rows, (row) => [
        row.scheduleId,
        row.vehiclePlate,
        row.maintenanceTitle,
        row.triggerType,
        row.intervalType,
        row.assignedMechanic,
        row.scheduleStatus,
        row.odometerReading,
        row.nextDueDate?.toISOString() ?? null,
        row.partsCost,
        row.laborCost,
        row.totalCost,
        row.createdAt.toISOString(),
    ], new Set([8, 12]));
}
async function replacePreparedAnalytics(connection, rows) {
    await connection.run('DELETE FROM analytics_snapshot');
    await insertBatches(connection, 'analytics_snapshot', [
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
    ], [rows.snapshot], (row) => [
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
    ], new Set([1, 2]));
    await connection.run('DELETE FROM maintenance_status_summary');
    await insertBatches(connection, 'maintenance_status_summary', ['status', 'scheduleCount', 'percentage'], rows.statusSummary, (row) => [row.status, row.scheduleCount, row.percentage], new Set());
    await connection.run('DELETE FROM maintenance_monthly_trend');
    await insertBatches(connection, 'maintenance_monthly_trend', [
        'monthKey',
        'scheduledCount',
        'completedCount',
        'activeCount',
        'overdueCount',
        'maintenanceCost',
    ], rows.monthlyTrends, (row) => [
        row.monthKey,
        row.scheduledCount,
        row.completedCount,
        row.activeCount,
        row.overdueCount,
        row.maintenanceCost,
    ], new Set());
    await connection.run('DELETE FROM vehicle_maintenance_kpi');
    await insertBatches(connection, 'vehicle_maintenance_kpi', [
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
    ], rows.vehicleKpis, (row) => [
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
    ], new Set([12, 13]));
    await connection.run('DELETE FROM maintenance_alerts');
    await insertBatches(connection, 'maintenance_alerts', [
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
    ], rows.alerts, (row) => [
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
    ], new Set([8, 9]));
}
async function dataMartCount(connection, table) {
    const reader = await connection.runAndReadAll(`SELECT COUNT(*) AS count FROM ${table}`);
    const row = reader.getRowObjectsJS()[0];
    return Number(row.count);
}
async function preparedAnalyticsCount(connection, table) {
    const reader = await connection.runAndReadAll(`SELECT COUNT(*) AS count FROM ${table}`);
    const row = reader.getRowObjectsJS()[0];
    return Number(row.count);
}


/***/ }),
/* 12 */
/***/ ((module) => {

module.exports = require("node:fs");

/***/ }),
/* 13 */
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
var SyncService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SyncService = void 0;
const common_1 = __webpack_require__(4);
const client_1 = __webpack_require__(14);
const adapter_pg_1 = __webpack_require__(15);
const pg_1 = __importDefault(__webpack_require__(16));
const duckdb_1 = __webpack_require__(11);
const analytics_service_1 = __webpack_require__(6);
const duckdb_datamart_service_1 = __webpack_require__(7);
const STATUS_ORDER = [
    client_1.MaintenanceStatus.PENDING,
    client_1.MaintenanceStatus.DUE,
    client_1.MaintenanceStatus.IN_PROGRESS,
    client_1.MaintenanceStatus.COMPLETED,
    client_1.MaintenanceStatus.OVERDUE,
    client_1.MaintenanceStatus.CANCELLED,
];
const ACTIVE_STATUSES = new Set([
    client_1.MaintenanceStatus.DUE,
    client_1.MaintenanceStatus.IN_PROGRESS,
    client_1.MaintenanceStatus.OVERDUE,
]);
function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
function numericValue(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : 0;
    if (typeof value === 'object') {
        if ('toNumber' in value &&
            typeof value.toNumber === 'function') {
            const num = value.toNumber();
            return Number.isFinite(num) ? num : 0;
        }
    }
    const str = String(value).trim();
    if (!str)
        return 0;
    const parsed = Number(str.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}
function sumFieldFromObject(value, targetKeys) {
    if (value === null || value === undefined)
        return 0;
    if (Array.isArray(value)) {
        return value.reduce((total, item) => total + sumFieldFromObject(item, targetKeys), 0);
    }
    if (typeof value !== 'object')
        return 0;
    if (('toNumber' in value &&
        typeof value.toNumber === 'function') ||
        value instanceof Date) {
        return 0;
    }
    let sum = 0;
    for (const [key, child] of Object.entries(value)) {
        if (targetKeys.includes(key)) {
            sum += numericValue(child);
        }
        else if (child && typeof child === 'object') {
            sum += sumFieldFromObject(child, targetKeys);
        }
    }
    return sum;
}
function schedulePartsCost(schedule) {
    const parts = numericValue(schedule.partsCost);
    if (parts > 0)
        return parts;
    if (schedule.workOrderProgress) {
        const fromJson = sumFieldFromObject(schedule.workOrderProgress, [
            'partsCost',
            'parts_cost',
        ]);
        if (fromJson > 0)
            return fromJson;
    }
    return 0;
}
function scheduleLaborCost(schedule) {
    const labor = numericValue(schedule.laborCost);
    if (labor > 0)
        return labor;
    if (schedule.workOrderProgress) {
        const fromJson = sumFieldFromObject(schedule.workOrderProgress, [
            'laborCost',
            'labor_cost',
        ]);
        if (fromJson > 0)
            return fromJson;
    }
    return 0;
}
/** Derive maintenance cost from dedicated scalar columns or workOrderProgress JSON (totalCost preferred). */
function scheduleTotalCost(schedule) {
    const total = numericValue(schedule.totalCost);
    if (total > 0)
        return total;
    const parts = schedulePartsCost(schedule);
    const labor = scheduleLaborCost(schedule);
    if (parts + labor > 0)
        return parts + labor;
    if (schedule.workOrderProgress) {
        const fromJson = sumFieldFromObject(schedule.workOrderProgress, [
            'totalCost',
            'total_cost',
            'cost',
        ]);
        if (fromJson > 0)
            return fromJson;
    }
    return 0;
}
function analyticsStatus(status, dueDate, generatedAt) {
    // Terminal / explicit statuses are authoritative — never override them.
    if (status === client_1.MaintenanceStatus.COMPLETED ||
        status === client_1.MaintenanceStatus.CANCELLED ||
        status === client_1.MaintenanceStatus.IN_PROGRESS ||
        status === client_1.MaintenanceStatus.DUE ||
        status === client_1.MaintenanceStatus.OVERDUE) {
        return status;
    }
    if (status === client_1.MaintenanceStatus.PENDING && dueDate) {
        const startOfToday = new Date(Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth(), generatedAt.getUTCDate()));
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysFromToday = (dueDate.getTime() - startOfToday.getTime()) / msPerDay;
        if (daysFromToday >= 0) {
            // Today or future — stays PENDING
            return client_1.MaintenanceStatus.PENDING;
        }
        // Past due: within 90 days → DUE, older than 90 days → OVERDUE
        if (daysFromToday >= -90) {
            return client_1.MaintenanceStatus.DUE;
        }
        return client_1.MaintenanceStatus.OVERDUE;
    }
    return status;
}
function utcMonthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function lastSixMonthKeys(generatedAt) {
    return Array.from({ length: 6 }, (_, index) => {
        const month = new Date(Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth() - (5 - index), 1));
        return utcMonthKey(month);
    });
}
let SyncService = SyncService_1 = class SyncService {
    analyticsService;
    dataMartService;
    logger = new common_1.Logger(SyncService_1.name);
    pool = null;
    prisma = null;
    listenClient = null;
    intervalTimer = null;
    debounceTimer = null;
    isSyncing = false;
    constructor(analyticsService, dataMartService) {
        this.analyticsService = analyticsService;
        this.dataMartService = dataMartService;
    }
    async onModuleInit() {
        const connectionString = process.env['DATABASE_URL'];
        if (!connectionString) {
            this.logger.warn('DATABASE_URL is not set. Auto-sync disabled.');
            return;
        }
        this.pool = new pg_1.default.Pool({ connectionString });
        this.prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(this.pool) });
        await this.installPostgresTriggers();
        const syncOnStartup = process.env['SYNC_ON_STARTUP'] !== 'false';
        if (syncOnStartup) {
            this.logger.log('Running initial PostgreSQL -> DuckDB sync...');
            await this.syncNow().catch((err) => this.logger.error('Startup sync failed:', err));
        }
        // Schedule fallback periodic sync (5 seconds for real-time responsiveness)
        const fallbackSeconds = Number(process.env['SYNC_FALLBACK_INTERVAL_SECONDS'] ?? 5);
        const intervalMs = (Number.isFinite(fallbackSeconds) && fallbackSeconds > 0
            ? fallbackSeconds
            : 5) * 1000;
        this.intervalTimer = setInterval(() => {
            this.syncNow().catch((err) => this.logger.error('Periodic sync failed:', err));
        }, intervalMs);
        // Setup PostgreSQL LISTEN/NOTIFY for real-time updates
        this.setupListenNotify(connectionString);
    }
    async installPostgresTriggers() {
        if (!this.pool)
            return;
        try {
            await this.pool.query(`
        CREATE OR REPLACE FUNCTION notify_vmms_table_change()
        RETURNS trigger AS $$
        BEGIN
          PERFORM pg_notify('vmms_data_changed', TG_TABLE_NAME);
          PERFORM pg_notify(TG_TABLE_NAME || '_changed', TG_TABLE_NAME);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
            DROP TRIGGER IF EXISTS trg_vehicles_notify ON vehicles;
            CREATE TRIGGER trg_vehicles_notify
            AFTER INSERT OR UPDATE OR DELETE ON vehicles
            FOR EACH STATEMENT EXECUTE FUNCTION notify_vmms_table_change();
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_schedules') THEN
            DROP TRIGGER IF EXISTS trg_maintenance_schedules_notify ON maintenance_schedules;
            CREATE TRIGGER trg_maintenance_schedules_notify
            AFTER INSERT OR UPDATE OR DELETE ON maintenance_schedules
            FOR EACH STATEMENT EXECUTE FUNCTION notify_vmms_table_change();
          END IF;
        END $$;
      `);
            this.logger.log('Successfully installed PostgreSQL NOTIFY triggers for real-time table sync.');
        }
        catch (err) {
            this.logger.warn(`Failed to install PostgreSQL triggers: ${err}`);
        }
    }
    async onModuleDestroy() {
        if (this.intervalTimer)
            clearInterval(this.intervalTimer);
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        if (this.listenClient) {
            try {
                await this.listenClient.end();
            }
            catch { }
        }
        if (this.prisma) {
            await this.prisma.$disconnect().catch(() => undefined);
        }
        if (this.pool) {
            await this.pool.end().catch(() => undefined);
        }
    }
    setupListenNotify(connectionString) {
        try {
            this.listenClient = new pg_1.default.Client({ connectionString });
            this.listenClient.connect(async (err) => {
                if (err) {
                    this.logger.warn(`Failed to connect PG LISTEN client: ${err.message}. Relying on fallback timer.`);
                    return;
                }
                this.logger.log('Connected PG LISTEN client for real-time sync.');
                const channels = ['vmms_data_changed', 'vehicles_changed', 'schedules_changed'];
                for (const ch of channels) {
                    try {
                        await this.listenClient?.query(`LISTEN ${ch}`);
                    }
                    catch { }
                }
                this.listenClient?.on('notification', (msg) => {
                    this.logger.log(`Received PG NOTIFY on channel: ${msg.channel}`);
                    this.scheduleDebouncedSync();
                });
                this.listenClient?.on('error', (clientErr) => {
                    this.logger.warn(`PG LISTEN client error: ${clientErr.message}`);
                });
            });
        }
        catch (err) {
            this.logger.warn(`Could not set up LISTEN/NOTIFY: ${err}`);
        }
    }
    scheduleDebouncedSync() {
        const debounceMs = Number(process.env['SYNC_DEBOUNCE_MS'] ?? 500);
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.syncNow().catch((err) => this.logger.error('Debounced sync failed:', err));
        }, debounceMs);
    }
    async syncNow() {
        if (this.isSyncing) {
            return { success: true, message: 'Sync already in progress.' };
        }
        if (!this.prisma) {
            const connectionString = process.env['DATABASE_URL'];
            if (!connectionString) {
                throw new Error('DATABASE_URL is not configured.');
            }
            this.pool = new pg_1.default.Pool({ connectionString });
            this.prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(this.pool) });
        }
        this.isSyncing = true;
        const startTime = Date.now();
        try {
            const duckdb = await this.dataMartService.getConnection();
            await (0, duckdb_1.initializeDataMart)(duckdb);
            const [vehicles, schedules] = await Promise.all([
                this.prisma.vehicle.findMany({
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        plateNumber: true,
                        model: true,
                        status: true,
                        odometer: true,
                        updatedAt: true,
                    },
                }),
                this.prisma.maintenanceSchedule.findMany({
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        vehicleId: true,
                        title: true,
                        triggerType: true,
                        intervalType: true,
                        assignedMechanic: true,
                        status: true,
                        odometerReading: true,
                        startReferenceDate: true,
                        createdAt: true,
                        updatedAt: true,
                        partsCost: true,
                        laborCost: true,
                        totalCost: true,
                        workOrderProgress: true,
                    },
                }),
            ]);
            const schedulesByPlate = new Map();
            for (const schedule of schedules) {
                const current = schedulesByPlate.get(schedule.vehicleId) ?? [];
                current.push(schedule);
                schedulesByPlate.set(schedule.vehicleId, current);
            }
            const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
            const vehicleRows = vehicles.map((vehicle) => {
                const matching = schedulesByPlate.get(vehicle.id) ?? [];
                const latest = matching.reduce((current, schedule) => !current || schedule.createdAt > current
                    ? schedule.createdAt
                    : current, null);
                return {
                    vehicleId: vehicle.id,
                    plateNumber: vehicle.plateNumber,
                    vehicleModel: vehicle.model,
                    vehicleStatus: vehicle.status,
                    currentOdometer: vehicle.odometer,
                    totalMaintenanceSchedules: matching.length,
                    latestMaintenanceDate: latest,
                };
            });
            const generatedAt = new Date();
            const startOfToday = new Date(Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth(), generatedAt.getUTCDate()));
            const dueSoonCutoff = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
            const scheduleStatusMap = new Map(schedules.map((schedule) => [
                schedule.id,
                analyticsStatus(schedule.status, schedule.startReferenceDate, generatedAt),
            ]));
            const scheduleRows = schedules.map((schedule) => ({
                scheduleId: schedule.id,
                vehiclePlate: vehicleById.get(schedule.vehicleId)?.plateNumber ??
                    schedule.vehicleId,
                maintenanceTitle: schedule.title,
                triggerType: schedule.triggerType,
                intervalType: schedule.intervalType,
                assignedMechanic: schedule.assignedMechanic ?? '',
                scheduleStatus: scheduleStatusMap.get(schedule.id) ?? schedule.status,
                odometerReading: schedule.odometerReading,
                nextDueDate: schedule.startReferenceDate,
                partsCost: round(schedulePartsCost(schedule)),
                laborCost: round(scheduleLaborCost(schedule)),
                totalCost: round(scheduleTotalCost(schedule)),
                createdAt: schedule.createdAt,
            }));
            const scheduleCost = new Map(schedules.map((schedule) => [
                schedule.id,
                round(scheduleTotalCost(schedule)),
            ]));
            const isDueWithin7Days = (schedule) => {
                const status = scheduleStatusMap.get(schedule.id);
                const dueDate = schedule.startReferenceDate;
                return (status === client_1.MaintenanceStatus.DUE ||
                    (status !== client_1.MaintenanceStatus.COMPLETED &&
                        status !== client_1.MaintenanceStatus.CANCELLED &&
                        status !== client_1.MaintenanceStatus.OVERDUE &&
                        dueDate !== null &&
                        dueDate.getTime() >= startOfToday.getTime() &&
                        dueDate.getTime() <= dueSoonCutoff.getTime()));
            };
            const statusCounts = new Map(STATUS_ORDER.map((status) => [status, 0]));
            for (const status of scheduleStatusMap.values()) {
                statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
            }
            const statusSummary = STATUS_ORDER.map((status) => {
                const scheduleCount = statusCounts.get(status) ?? 0;
                return {
                    status,
                    scheduleCount,
                    percentage: schedules.length
                        ? round((scheduleCount / schedules.length) * 100)
                        : 0,
                };
            });
            const monthlyTrends = lastSixMonthKeys(generatedAt).map((monthKey) => {
                const matching = schedules.filter((schedule) => utcMonthKey(schedule.startReferenceDate ?? schedule.createdAt) ===
                    monthKey);
                return {
                    monthKey,
                    scheduledCount: matching.length,
                    completedCount: matching.filter((schedule) => scheduleStatusMap.get(schedule.id) ===
                        client_1.MaintenanceStatus.COMPLETED).length,
                    activeCount: matching.filter((schedule) => ACTIVE_STATUSES.has(scheduleStatusMap.get(schedule.id))).length,
                    overdueCount: matching.filter((schedule) => scheduleStatusMap.get(schedule.id) ===
                        client_1.MaintenanceStatus.OVERDUE).length,
                    maintenanceCost: round(matching.reduce((total, schedule) => total + (scheduleCost.get(schedule.id) ?? 0), 0)),
                };
            });
            const schedulesForVehicle = (vehicle) => [
                ...(schedulesByPlate.get(vehicle.plateNumber) ?? []),
                ...(schedulesByPlate.get(vehicle.id) ?? []),
            ].filter((schedule, index, rows) => rows.findIndex((candidate) => candidate.id === schedule.id) ===
                index);
            const vehicleKpis = vehicles.map((vehicle) => {
                const matching = schedulesForVehicle(vehicle);
                const active = matching.filter((schedule) => ACTIVE_STATUSES.has(scheduleStatusMap.get(schedule.id)));
                const completed = matching.filter((schedule) => scheduleStatusMap.get(schedule.id) ===
                    client_1.MaintenanceStatus.COMPLETED);
                const overdue = matching.filter((schedule) => scheduleStatusMap.get(schedule.id) ===
                    client_1.MaintenanceStatus.OVERDUE);
                const dueWithin7DaysCount = matching.filter(isDueWithin7Days).length;
                const dates = matching.map((schedule) => schedule.createdAt);
                const openDueDates = matching
                    .filter((schedule) => {
                    const status = scheduleStatusMap.get(schedule.id);
                    return (status !== client_1.MaintenanceStatus.COMPLETED &&
                        status !== client_1.MaintenanceStatus.CANCELLED);
                })
                    .map((schedule) => schedule.startReferenceDate)
                    .filter((date) => date !== null)
                    .sort((left, right) => left.getTime() - right.getTime());
                const riskLevel = overdue.length
                    ? 'HIGH'
                    : active.length || dueWithin7DaysCount || vehicle.status !== 'AVAILABLE'
                        ? 'MEDIUM'
                        : 'LOW';
                return {
                    vehicleId: vehicle.id,
                    plateNumber: vehicle.plateNumber,
                    vehicleModel: vehicle.model,
                    vehicleStatus: vehicle.status,
                    currentOdometer: vehicle.odometer,
                    totalSchedules: matching.length,
                    activeSchedules: active.length,
                    completedSchedules: completed.length,
                    overdueSchedules: overdue.length,
                    dueWithin7Days: dueWithin7DaysCount,
                    maintenanceCost: round(matching.reduce((total, schedule) => total + (scheduleCost.get(schedule.id) ?? 0), 0)),
                    completionRate: matching.length
                        ? round((completed.length / matching.length) * 100)
                        : 0,
                    latestMaintenanceDate: dates.length
                        ? new Date(Math.max(...dates.map((date) => date.getTime())))
                        : null,
                    nextDueDate: openDueDates[0] ?? null,
                    riskLevel,
                };
            });
            const alerts = schedules.flatMap((schedule) => {
                const status = scheduleStatusMap.get(schedule.id);
                const dueDate = schedule.startReferenceDate;
                if (status === client_1.MaintenanceStatus.OVERDUE) {
                    return [
                        {
                            alertId: `OVERDUE:${schedule.id}`,
                            scheduleId: schedule.id,
                            vehiclePlate: vehicleById.get(schedule.vehicleId)?.plateNumber ??
                                schedule.vehicleId,
                            severity: 'HIGH',
                            alertType: 'OVERDUE_MAINTENANCE',
                            maintenanceTitle: schedule.title,
                            message: `${schedule.title} is overdue for vehicle ${vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId}.`,
                            recommendedAction: 'Prioritize and assign this maintenance work immediately.',
                            dueDate,
                            generatedAt,
                        },
                    ];
                }
                if (isDueWithin7Days(schedule) && dueDate) {
                    return [
                        {
                            alertId: `DUE_SOON:${schedule.id}`,
                            scheduleId: schedule.id,
                            vehiclePlate: vehicleById.get(schedule.vehicleId)?.plateNumber ??
                                schedule.vehicleId,
                            severity: 'MEDIUM',
                            alertType: 'DUE_SOON',
                            maintenanceTitle: schedule.title,
                            message: `${schedule.title} is due within seven days for vehicle ${vehicleById.get(schedule.vehicleId)?.plateNumber ?? schedule.vehicleId}.`,
                            recommendedAction: 'Confirm mechanic availability and maintenance resources.',
                            dueDate,
                            generatedAt,
                        },
                    ];
                }
                return [];
            });
            const activeVehicleCount = vehicleKpis.filter((vehicle) => vehicle.activeSchedules > 0).length;
            const completedSchedulesCount = statusCounts.get(client_1.MaintenanceStatus.COMPLETED) ?? 0;
            const sourceUpdatedDates = [
                ...vehicles.map((vehicle) => vehicle.updatedAt),
                ...schedules.map((schedule) => schedule.updatedAt),
            ];
            const totalCostSum = Array.from(scheduleCost.values()).reduce((total, cost) => total + cost, 0);
            const preparedAnalytics = {
                snapshot: {
                    snapshotKey: 'current',
                    generatedAt,
                    sourceMaxUpdatedAt: sourceUpdatedDates.length
                        ? new Date(Math.max(...sourceUpdatedDates.map((date) => date.getTime())))
                        : null,
                    totalVehicles: vehicles.length,
                    availableVehicles: vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length,
                    underMaintenanceVehicles: activeVehicleCount,
                    underRepairVehicles: vehicles.filter((vehicle) => vehicle.status === 'UNDER_REPAIR').length,
                    totalSchedules: schedules.length,
                    pendingSchedules: statusCounts.get(client_1.MaintenanceStatus.PENDING) ?? 0,
                    dueSchedules: statusCounts.get(client_1.MaintenanceStatus.DUE) ?? 0,
                    inProgressSchedules: statusCounts.get(client_1.MaintenanceStatus.IN_PROGRESS) ?? 0,
                    completedSchedules: completedSchedulesCount,
                    overdueSchedules: statusCounts.get(client_1.MaintenanceStatus.OVERDUE) ?? 0,
                    cancelledSchedules: statusCounts.get(client_1.MaintenanceStatus.CANCELLED) ?? 0,
                    dueWithin7Days: schedules.filter(isDueWithin7Days).length,
                    activeMaintenanceVehicles: activeVehicleCount,
                    averageOdometer: vehicles.length
                        ? round(vehicles.reduce((total, vehicle) => total + vehicle.odometer, 0) / vehicles.length)
                        : 0,
                    totalMaintenanceCost: round(totalCostSum),
                    completionRate: schedules.length
                        ? round((completedSchedulesCount / schedules.length) * 100)
                        : 0,
                    fleetPerformance: vehicles.length
                        ? round(((vehicles.length - activeVehicleCount) / vehicles.length) *
                            100)
                        : 0,
                },
                statusSummary,
                monthlyTrends,
                vehicleKpis,
                alerts,
            };
            await (0, duckdb_1.replaceVehicleSummary)(duckdb, vehicleRows);
            await (0, duckdb_1.replaceMaintenanceScheduleSummary)(duckdb, scheduleRows);
            await (0, duckdb_1.replacePreparedAnalytics)(duckdb, preparedAnalytics);
            // Reset cached DuckDB connection in AnalyticsService
            this.analyticsService.resetConnection();
            const durationMs = Date.now() - startTime;
            const msg = `Synced ${vehicles.length} vehicles and ${schedules.length} schedules to DuckDB in ${durationMs}ms.`;
            this.logger.log(msg);
            return { success: true, message: msg };
        }
        catch (error) {
            const errMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`PostgreSQL -> DuckDB sync failed: ${errMessage}`, error);
            throw error;
        }
        finally {
            this.isSyncing = false;
        }
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof analytics_service_1.AnalyticsService !== "undefined" && analytics_service_1.AnalyticsService) === "function" ? _a : Object, typeof (_b = typeof duckdb_datamart_service_1.DuckDbDataMartService !== "undefined" && duckdb_datamart_service_1.DuckDbDataMartService) === "function" ? _b : Object])
], SyncService);


/***/ }),
/* 14 */
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = require("@prisma/adapter-pg");

/***/ }),
/* 16 */
/***/ ((module) => {

module.exports = require("pg");

/***/ }),
/* 17 */
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
    getSchedule(id) {
        return this.analyticsService.getScheduleWithAi(id);
    }
    getScheduleAi(id) {
        return this.analyticsService.getScheduleWithAi(id);
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
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MaintenanceSchedulesController.prototype, "getSchedule", null);
__decorate([
    (0, common_1.Get)(':id/ai'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MaintenanceSchedulesController.prototype, "getScheduleAi", null);
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