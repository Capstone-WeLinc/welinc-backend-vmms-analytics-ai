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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const sync_service_1 = require("./sync.service");
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
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        sync_service_1.SyncService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map