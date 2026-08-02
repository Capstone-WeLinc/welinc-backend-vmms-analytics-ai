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
        function fmtCost(n) {
            if (n === null || n === undefined || Number.isNaN(Number(n)))
                return '₱0.00';
            return `₱${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fleet Maintenance & Analytics AI Dashboard</title>
    <style>
      :root {
        --bg-dark: #0f172a;
        --card-bg: #1e293b;
        --card-border: #334155;
        --accent-blue: #3b82f6;
        --accent-emerald: #10b981;
        --accent-amber: #f59e0b;
        --accent-rose: #f43f5e;
        --text-bright: #f8fafc;
        --text-muted: #94a3b8;
      }
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: var(--bg-dark); color: #e2e8f0; line-height: 1.5; }
      .wrap { max-width: 1280px; margin: 0 auto; padding: 24px; }
      .nav-bar { display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid var(--card-border); padding-bottom: 12px; }
      .nav-tab { color: var(--text-muted); text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; }
      .nav-tab:hover { color: var(--text-bright); background: #1e293b; }
      .nav-tab.active { color: #ffffff; background: #2563eb; }
      .header-title { margin: 0 0 4px 0; font-size: 1.8rem; font-weight: 800; color: var(--text-bright); }
      .header-sub { color: var(--text-muted); margin: 0 0 24px 0; font-size: 0.95rem; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
      .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
      .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
      .stat-val { font-size: 1.6rem; font-weight: 800; color: var(--text-bright); margin-top: 4px; }
      .stat-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
      .cost { color: var(--accent-emerald); font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.9rem; }
      th, td { padding: 12px; border-bottom: 1px solid var(--card-border); text-align: left; }
      th { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
      .badge { padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; display: inline-block; }
      .badge.HIGH { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
      .badge.MEDIUM { background: #78350f; color: #fcd34d; border: 1px solid #f59e0b; }
      .badge.LOW { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
      .anomaly { border-left: 4px solid var(--accent-amber); padding: 12px; background: #111827; border-radius: 6px; margin-bottom: 10px; }
      .btn { display: inline-block; padding: 6px 12px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.85rem; transition: background 0.2s; }
      .btn:hover { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <nav class="nav-bar">
        <a href="/ai" class="nav-tab active">Fleet Scheduling Analytics</a>
        <a href="/ai/workorders" class="nav-tab">Work Orders &amp; Mechanics AI</a>
      </nav>

      <h1 class="header-title">Maintenance Scheduling Dashboard</h1>
      <p class="header-sub">Automated fleet analytics generated from the VMMS DuckDB data mart.</p>
      
      <div class="grid">
        <div class="card" style="border-top: 4px solid var(--accent-blue);">
          <div class="stat-label">Total Vehicles</div>
          <div class="stat-val">${fmtNumber(overview?.snapshot?.totalVehicles)}</div>
          <div class="stat-sub">${fmtNumber(overview?.snapshot?.availableVehicles)} available | ${fmtNumber(overview?.snapshot?.underMaintenanceVehicles)} in maintenance</div>
        </div>
        <div class="card" style="border-top: 4px solid var(--accent-emerald);">
          <div class="stat-label">Completion Rate</div>
          <div class="stat-val">${fmtPercent(overview?.snapshot?.completionRate)}</div>
          <div class="stat-sub">${fmtNumber(overview?.snapshot?.completedSchedules)} of ${fmtNumber(overview?.snapshot?.totalSchedules)} schedules completed</div>
        </div>
        <div class="card" style="border-top: 4px solid #10b981;">
          <div class="stat-label">Total Maintenance Cost</div>
          <div class="stat-val cost">${fmtCost(overview?.snapshot?.totalMaintenanceCost)}</div>
          <div class="stat-sub">Avg / Schedule: ${fmtCost(summaryMetrics?.avgCostPerSchedule)}</div>
        </div>
        <div class="card" style="border-top: 4px solid var(--accent-amber);">
          <div class="stat-label">Data Mart Snapshot</div>
          <div class="stat-val" style="font-size: 1.1rem; margin-top: 8px;">Current</div>
          <div class="stat-sub">Generated: ${fmtDate(overview?.snapshot?.generatedAt)}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 style="margin-top: 0; color: var(--accent-blue);">Predictive Maintenance Forecast</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Estimated vehicles requiring service windows:</p>
          <ul>
            <li><strong>Next 7 Days:</strong> ${fmtNumber(forecast?.dueIn7Days)} vehicles</li>
            <li><strong>Next 30 Days:</strong> ${fmtNumber(forecast?.dueIn30Days)} vehicles</li>
            <li><strong>Next 90 Days:</strong> ${fmtNumber(forecast?.dueIn90Days)} vehicles</li>
          </ul>
        </div>

        <div class="card">
          <h3 style="margin-top: 0; color: var(--accent-blue);">Maintenance Status Breakdown</h3>
          <ul>
            ${(overview?.statusBreakdown || []).map((item) => `<li><strong>${item.status}:</strong> ${fmtNumber(item.scheduleCount)} (${fmtPercent(item.percentage)})</li>`).join('')}
          </ul>
        </div>

        <div class="card">
          <h3 style="margin-top: 0; color: var(--accent-blue);">Top Maintenance Types</h3>
          <ul>
            ${(trends?.topTypes || []).map((item) => `<li><strong>${item.maintenanceTitle}:</strong> ${fmtNumber(item.count)} schedules</li>`).join('')}
          </ul>
        </div>
      </div>

      ${anomalies?.repeatedFailures?.length || anomalies?.missingDates?.length ? `
      <div class="card" style="border-left: 6px solid var(--accent-amber);">
        <h3 style="margin-top: 0; color: var(--accent-amber);">Anomalies &amp; Data Integrity Alerts</h3>
        ${(anomalies?.repeatedFailures || []).map((r) => `
          <div class="anomaly">
            <strong>Repeated Component Failure:</strong> Vehicle <strong>${r.vehiclePlate}</strong> recorded ${r.incidentCount} instances of "${r.maintenanceTitle}".
          </div>
        `).join('')}
        ${(anomalies?.missingDates || []).map((m) => `
          <div class="anomaly">
            <strong>Missing Reference Date:</strong> Schedule ${m.scheduleId} (${m.maintenanceTitle}) for Vehicle <strong>${m.vehiclePlate}</strong> lacks next due date.
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="card" style="border-color: #3b82f6;">
        <h3 style="margin-top: 0; color: #38bdf8;">Gemini AI Executive Advisory</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6; color: #cbd5e1; font-size: 0.95rem;">${this.escapeHtml(aiSummary)}</pre>
      </div>

      <div class="card">
        <h3 style="margin-top: 0; color: var(--text-bright);">Vehicle Risk Analysis &amp; Schedule KPIs</h3>
        <table>
          <thead>
            <tr><th>Plate</th><th>Risk</th><th>Score</th><th>Reason</th><th>Active</th><th>Overdue</th><th>Next Due</th><th>Completion</th></tr>
          </thead>
          <tbody>
            ${(vehicleKpis?.vehicles || []).slice(0, 10).map((vehicle) => `
              <tr>
                <td><strong>${vehicle.plateNumber || 'n/a'}</strong></td>
                <td><span class="badge ${vehicle.riskLevel || 'LOW'}">${vehicle.riskLevel || 'n/a'}</span></td>
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
    async getWorkOrdersPage(mechanicFilter, statusFilter, res) {
        const [summaryResult, workOrdersResult, aiInsights] = await Promise.all([
            this.analyticsService.getWorkOrderSummary(),
            this.analyticsService.getScheduleWorkOrders(mechanicFilter, statusFilter, '100'),
            this.analyticsService.getWorkOrderAiInsights(),
        ]);
        function fmtNumber(n) {
            if (n === null || n === undefined || Number.isNaN(Number(n)))
                return '0';
            return Intl.NumberFormat('en-US').format(Number(n));
        }
        function fmtCost(n) {
            if (n === null || n === undefined || Number.isNaN(Number(n)))
                return '₱0.00';
            return `₱${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        function fmtPercent(n) {
            if (n === null || n === undefined || Number.isNaN(Number(n)))
                return '0%';
            return `${Number(n).toFixed(1)}%`;
        }
        const s = summaryResult?.summary ?? {};
        const mechanics = summaryResult?.mechanicWorkload ?? [];
        const workOrders = workOrdersResult?.workOrders ?? [];
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Work Orders &amp; Mechanics AI Dashboard</title>
    <style>
      :root {
        --bg-dark: #0f172a;
        --card-bg: #1e293b;
        --card-border: #334155;
        --accent-blue: #3b82f6;
        --accent-emerald: #10b981;
        --accent-amber: #f59e0b;
        --accent-rose: #f43f5e;
        --text-bright: #f8fafc;
        --text-muted: #94a3b8;
      }
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: var(--bg-dark); color: #e2e8f0; line-height: 1.5; }
      .wrap { max-width: 1280px; margin: 0 auto; padding: 24px; }
      .nav-bar { display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid var(--card-border); padding-bottom: 12px; }
      .nav-tab { color: var(--text-muted); text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; }
      .nav-tab:hover { color: var(--text-bright); background: #1e293b; }
      .nav-tab.active { color: #ffffff; background: #2563eb; }
      .header-title { margin: 0 0 4px 0; font-size: 1.8rem; font-weight: 800; color: var(--text-bright); }
      .header-sub { color: var(--text-muted); margin: 0 0 24px 0; font-size: 0.95rem; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
      .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
      .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
      .stat-val { font-size: 1.6rem; font-weight: 800; color: var(--text-bright); margin-top: 4px; }
      .stat-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
      .cost { color: var(--accent-emerald); font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.9rem; }
      th, td { padding: 12px; border-bottom: 1px solid var(--card-border); text-align: left; }
      th { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
      .badge { padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; display: inline-block; }
      .badge.HIGH { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
      .badge.MEDIUM { background: #78350f; color: #fcd34d; border: 1px solid #f59e0b; }
      .badge.LOW, .badge.NORMAL { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
      .btn { display: inline-block; padding: 6px 12px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.85rem; transition: background 0.2s; }
      .btn:hover { background: #1d4ed8; }
      .progress-bar-bg { background: #334155; border-radius: 9999px; height: 8px; width: 100%; overflow: hidden; margin-top: 6px; }
      .progress-bar-fill { background: var(--accent-emerald); height: 100%; border-radius: 9999px; }
      .filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
      .filter-select { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <nav class="nav-bar">
        <a href="/ai" class="nav-tab">Fleet Scheduling Analytics</a>
        <a href="/ai/workorders" class="nav-tab active">Work Orders &amp; Mechanics AI</a>
      </nav>

      <h1 class="header-title">Work Orders &amp; Mechanic Analytics AI</h1>
      <p class="header-sub">Real-time work order tracking, mechanic workload balancing, and maintenance cost insights.</p>

      <!-- KPI Executive Summary Grid -->
      <div class="grid">
        <div class="card" style="border-top: 4px solid var(--accent-blue);">
          <div class="stat-label">Total Work Orders</div>
          <div class="stat-val">${fmtNumber(s.totalWorkOrders)}</div>
          <div class="stat-sub">${fmtNumber(s.openWorkOrders)} Open | ${fmtNumber(s.inProgressWorkOrders)} In-Progress</div>
        </div>
        <div class="card" style="border-top: 4px solid var(--accent-rose);">
          <div class="stat-label">Overdue Work Orders</div>
          <div class="stat-val" style="color: var(--accent-rose);">${fmtNumber(s.overdueWorkOrders)}</div>
          <div class="stat-sub">${fmtNumber(s.completedWorkOrders)} completed schedules</div>
        </div>
        <div class="card" style="border-top: 4px solid var(--accent-emerald);">
          <div class="stat-label">Total Maintenance Cost</div>
          <div class="stat-val cost">${fmtCost(s.totalCost)}</div>
          <div class="stat-sub">Parts: ${fmtCost(s.totalPartsCost)} | Labor: ${fmtCost(s.totalLaborCost)}</div>
        </div>
        <div class="card" style="border-top: 4px solid var(--accent-amber);">
          <div class="stat-label">Avg Cost / Work Order</div>
          <div class="stat-val cost">${fmtCost(s.avgCostPerWorkOrder)}</div>
          <div class="stat-sub">${fmtNumber(s.workOrdersWithCost)} WOs with logged cost</div>
        </div>
      </div>

      <!-- Mechanic Workload & Cost Performance -->
      <div class="card" style="margin-bottom: 24px;">
        <h3 style="margin-top: 0; color: var(--accent-blue);">Mechanic Workload &amp; Financial Summary</h3>
        <table>
          <thead>
            <tr><th>Mechanic</th><th>Assigned WOs</th><th>Active</th><th>Completed</th><th>Overdue</th><th>Completion Rate</th><th>Total Cost</th><th>Avg Cost / WO</th><th>Risk</th></tr>
          </thead>
          <tbody>
            ${mechanics.map((m) => `
              <tr>
                <td><strong>${m.mechanic}</strong></td>
                <td>${fmtNumber(m.totalAssigned)}</td>
                <td>${fmtNumber(m.inProgress)}</td>
                <td>${fmtNumber(m.completed)}</td>
                <td>${fmtNumber(m.overdue)} ${m.overdueOver30Days > 0 ? `<span style="color: var(--accent-rose); font-size: 0.8rem;">(${m.overdueOver30Days} >30d)</span>` : ''}</td>
                <td>
                  <div>${fmtPercent(m.completionRate)}</div>
                  <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.min(100, Math.max(0, m.completionRate))}%;"></div></div>
                </td>
                <td class="cost">${fmtCost(m.totalCost)}</td>
                <td class="cost">${fmtCost(m.avgCostPerWorkOrder)}</td>
                <td><span class="badge ${m.riskLevel}">${m.riskLevel}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Gemini AI Work Order Advisory -->
      <div class="card" style="border-color: #3b82f6; margin-bottom: 24px;">
        <h3 style="margin-top: 0; color: #38bdf8;">Gemini AI Mechanic Workload &amp; Cost Advisory</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6; color: #cbd5e1; font-size: 0.95rem;">${this.escapeHtml(aiInsights)}</pre>
      </div>

      <!-- Filterable Work Orders List -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
          <h3 style="margin: 0; color: var(--text-bright);">Active &amp; Scheduled Work Orders</h3>
          <form class="filter-bar" method="GET" action="/ai/workorders">
            <select name="status" class="filter-select" onchange="this.form.submit()">
              <option value="" ${!statusFilter ? 'selected' : ''}>All Statuses</option>
              <option value="OVERDUE" ${statusFilter === 'OVERDUE' ? 'selected' : ''}>Overdue</option>
              <option value="IN_PROGRESS" ${statusFilter === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
              <option value="DUE" ${statusFilter === 'DUE' ? 'selected' : ''}>Due Soon</option>
              <option value="PENDING" ${statusFilter === 'PENDING' ? 'selected' : ''}>Pending</option>
              <option value="COMPLETED" ${statusFilter === 'COMPLETED' ? 'selected' : ''}>Completed</option>
            </select>
          </form>
        </div>
        <table>
          <thead>
            <tr><th>Plate</th><th>Maintenance Title</th><th>Priority</th><th>Status</th><th>Mechanic</th><th>Days Open</th><th>Cost</th><th>AI Execution Checklist</th></tr>
          </thead>
          <tbody>
            ${workOrders.map((wo) => `
              <tr>
                <td><strong>${wo.vehiclePlate}</strong></td>
                <td>${wo.maintenanceTitle}</td>
                <td><span class="badge ${wo.priority}">${wo.priority}</span></td>
                <td>${wo.statusLabel}</td>
                <td>${wo.mechanic || 'Unassigned'}</td>
                <td>${wo.daysOpen}d ${wo.daysOverdue > 0 ? `<span style="color: var(--accent-rose);">(${wo.daysOverdue}d overdue)</span>` : ''}</td>
                <td class="cost">${fmtCost(wo.totalCost)}</td>
                <td>
                  <a href="/ai/workorders/${wo.scheduleId}" class="btn">AI Checklist &amp; Guide</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
        res?.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res?.send(html);
    }
    async getWorkOrderDetailPage(scheduleId, res) {
        const [rec, woResult] = await Promise.all([
            this.analyticsService.getWorkOrderRecommendations(scheduleId),
            this.analyticsService.getWorkOrderById(scheduleId),
        ]);
        function fmtCost(n) {
            if (n === null || n === undefined || Number.isNaN(Number(n)))
                return '₱0.00';
            return `₱${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const wo = woResult?.workOrder ?? {};
        const checklist = rec?.checklist ?? [];
        const aiText = rec?.aiRecommendations ?? '';
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Execution Guide — ${wo.maintenanceTitle || 'Work Order'}</title>
    <style>
      :root {
        --bg-dark: #0f172a;
        --card-bg: #1e293b;
        --card-border: #334155;
        --accent-blue: #3b82f6;
        --accent-emerald: #10b981;
        --accent-amber: #f59e0b;
        --accent-rose: #f43f5e;
        --text-bright: #f8fafc;
        --text-muted: #94a3b8;
      }
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: var(--bg-dark); color: #e2e8f0; line-height: 1.5; }
      .wrap { max-width: 1000px; margin: 0 auto; padding: 24px; }
      .back { color: var(--accent-blue); text-decoration: none; font-weight: 600; font-size: 0.95rem; display: inline-block; margin-bottom: 20px; }
      .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
      .badge { padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.8em; letter-spacing: 0.05em; display: inline-block; }
      .badge.HIGH { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
      .badge.MEDIUM { background: #78350f; color: #fcd34d; border: 1px solid #f59e0b; }
      .badge.LOW, .badge.NORMAL { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
      .cost { color: var(--accent-emerald); font-weight: 700; }
      .step-item { display: flex; gap: 14px; align-items: flex-start; padding: 14px; background: #111827; border: 1px solid var(--card-border); border-radius: 8px; margin-bottom: 10px; }
      .step-item input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; accent-color: #2563eb; margin-top: 2px; }
      .step-title { font-weight: 700; font-size: 1rem; color: var(--text-bright); }
      .step-desc { font-size: 0.9rem; color: var(--text-muted); margin-top: 4px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <a href="/ai/workorders" class="back">&larr; Back to Work Orders &amp; Mechanics AI</a>

      <!-- Header Card -->
      <div class="card" style="border-left: 6px solid #2563eb;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
          <div>
            <h1 style="margin: 0 0 8px 0; font-size: 1.6rem; color: var(--text-bright);">${wo.maintenanceTitle || 'Work Order Execution Guide'}</h1>
            <p style="margin: 0; color: var(--text-muted);">Vehicle: <strong>${wo.vehiclePlate}</strong> | Assigned Mechanic: <strong>${wo.mechanic || 'Unassigned'}</strong></p>
          </div>
          <div>
            <span class="badge ${wo.priority}">${wo.priority || 'NORMAL'}</span>
            <span class="badge ${wo.status === 'OVERDUE' ? 'HIGH' : 'LOW'}" style="margin-left: 8px;">${wo.statusLabel || wo.status}</span>
          </div>
        </div>
      </div>

      <!-- Financial & Timing Bar -->
      <div class="grid">
        <div class="card">
          <div style="font-size: 0.85rem; color: var(--text-muted);">Odometer Reading</div>
          <div style="font-size: 1.2rem; font-weight: 700; margin-top: 4px;">${wo.odometerReading ? wo.odometerReading + ' km' : 'n/a'}</div>
        </div>
        <div class="card">
          <div style="font-size: 0.85rem; color: var(--text-muted);">Days Open / Overdue</div>
          <div style="font-size: 1.2rem; font-weight: 700; margin-top: 4px;">${wo.daysOpen}d open ${wo.daysOverdue > 0 ? `<span style="color: var(--accent-rose);">(${wo.daysOverdue}d overdue)</span>` : ''}</div>
        </div>
        <div class="card">
          <div style="font-size: 0.85rem; color: var(--text-muted);">Total Maintenance Cost</div>
          <div class="cost" style="font-size: 1.2rem; font-weight: 700; margin-top: 4px;">${fmtCost(wo.totalCost)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Parts: ${fmtCost(wo.partsCost)} | Labor: ${fmtCost(wo.laborCost)}</div>
        </div>
      </div>

      <!-- Interactive Execution Checklist Card -->
      <div class="card">
        <h2 style="margin-top: 0; color: #60a5fa;">Interactive Service Execution Checklist</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">Check off steps as you complete them during maintenance service:</p>
        <div>
          ${checklist.map((step) => `
            <div class="step-item">
              <input type="checkbox" id="step-${step.stepNumber}" />
              <div>
                <label for="step-${step.stepNumber}" class="step-title">STEP ${step.stepNumber}: ${step.title}</label>
                <div class="step-desc">${step.description}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Full Gemini AI Technical Advisory -->
      <div class="card" style="border-color: #3b82f6;">
        <h3 style="margin-top: 0; color: #38bdf8;">Gemini Technical Advisory &amp; Diagnostic Guide</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6; color: #cbd5e1; font-size: 0.95rem;">${this.escapeHtml(aiText)}</pre>
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
    (0, common_1.Get)(['ai', 'analytics/ai']),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardPage", null);
__decorate([
    (0, common_1.Get)(['ai/workorders', 'analytics/ai/workorders', 'workorders', 'analytics/workorders']),
    __param(0, (0, common_1.Query)('mechanic')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getWorkOrdersPage", null);
__decorate([
    (0, common_1.Get)(['ai/workorders/:id', 'analytics/ai/workorders/:id', 'workorders/:id', 'analytics/workorders/:id']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getWorkOrderDetailPage", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map