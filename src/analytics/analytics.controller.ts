import { Controller, Get, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SyncService } from './sync.service';

@Controller()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly syncService: SyncService,
  ) {}

  @Post('sync')
  @Post('analytics/sync')
  async triggerSync() {
    return this.syncService.syncNow();
  }

  @Get('health')
  getHealth() {
    return this.analyticsService.getHealth();
  }

  @Get('overview')
  async getOverview() {
    const [overview, forecast, anomalies, trends] = await Promise.all([
      this.analyticsService.getOverview(),
      this.analyticsService.getPredictiveForecast(),
      this.analyticsService.getAnomalies(),
      this.analyticsService.getExpandedTrends(),
    ]);
    return { ...overview, forecast, anomalies, trends };
  }

  @Get('analytics/overview')
  async getOverviewLegacy() {
    const [overview, forecast, anomalies, trends] = await Promise.all([
      this.analyticsService.getOverview(),
      this.analyticsService.getPredictiveForecast(),
      this.analyticsService.getAnomalies(),
      this.analyticsService.getExpandedTrends(),
    ]);
    return { ...overview, forecast, anomalies, trends };
  }

  @Get('vehicles')
  getVehicleKpis() {
    return this.analyticsService.getVehicleKpis();
  }

  @Get('analytics/vehicles')
  getVehicleKpisLegacy() {
    return this.analyticsService.getVehicleKpis();
  }

  @Get('insights')
  async getAiInsights() {
    const aiSummary = await this.analyticsService.getAiInsights();
    return { aiSummary };
  }

  @Get('analytics/insights')
  async getAiInsightsLegacy() {
    const aiSummary = await this.analyticsService.getAiInsights();
    return { aiSummary };
  }

  @Get('alerts')
  getAlerts() {
    return this.analyticsService.getAlerts();
  }

  @Get('analytics/alerts')
  getAlertsLegacy() {
    return this.analyticsService.getAlerts();
  }

  @Get('report')
  getReport() {
    return this.analyticsService.getReport();
  }

  @Get('analytics/report')
  getReportLegacy() {
    return this.analyticsService.getReport();
  }
}
