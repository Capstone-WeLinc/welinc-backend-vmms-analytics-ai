"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const analytics_controller_1 = require("./analytics/analytics.controller");
const analytics_service_1 = require("./analytics/analytics.service");
const sync_service_1 = require("./analytics/sync.service");
const duckdb_datamart_service_1 = require("./analytics/duckdb-datamart.service");
const dashboard_controller_1 = require("./analytics/dashboard.controller");
const maintenance_schedules_controller_1 = require("./analytics/maintenance-schedules.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [analytics_controller_1.AnalyticsController, dashboard_controller_1.DashboardController, maintenance_schedules_controller_1.MaintenanceSchedulesController],
        providers: [duckdb_datamart_service_1.DuckDbDataMartService, analytics_service_1.AnalyticsService, sync_service_1.SyncService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map