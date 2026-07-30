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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
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
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map