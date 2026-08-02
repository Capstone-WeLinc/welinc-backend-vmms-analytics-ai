import { Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Get('workorders')
  getWorkOrders() {
    return this.analyticsService.getWorkOrderSummary();
  }

  @Get('analytics/workorders')
  getWorkOrdersLegacy() {
    return this.analyticsService.getWorkOrderSummary();
  }

  @Get('workorders/mechanics')
  getMechanicWorkload() {
    return this.analyticsService.getMechanicWorkload();
  }

  @Get('analytics/workorders/mechanics')
  getMechanicWorkloadLegacy() {
    return this.analyticsService.getMechanicWorkload();
  }

  @Get('workorders/ai-insights')
  async getWorkOrderAiInsights() {
    const aiSummary = await this.analyticsService.getWorkOrderAiInsights();
    return { aiSummary };
  }

  @Get('analytics/workorders/ai-insights')
  async getWorkOrderAiInsightsLegacy() {
    const aiSummary = await this.analyticsService.getWorkOrderAiInsights();
    return { aiSummary };
  }

  @Get('workorders/list')
  getWorkOrderList(
    @Query('mechanic') mechanic?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getScheduleWorkOrders(mechanic, status, limit);
  }

  @Get('analytics/workorders/list')
  getWorkOrderListLegacy(
    @Query('mechanic') mechanic?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getScheduleWorkOrders(mechanic, status, limit);
  }

  @Get('workorders/item/:id')
  getWorkOrderItem(@Param('id') id: string) {
    return this.analyticsService.getWorkOrderById(id);
  }

  @Get('analytics/workorders/item/:id')
  getWorkOrderItemLegacy(@Param('id') id: string) {
    return this.analyticsService.getWorkOrderById(id);
  }

  @Get('workorders/recommendations/:id')
  getWorkOrderRecommendations(
    @Param('id') id: string,
    @Query('title') title?: string,
    @Query('vehicle') vehicle?: string,
  ) {
    return this.analyticsService.getWorkOrderRecommendations(id, title, vehicle);
  }

  @Get('analytics/workorders/recommendations/:id')
  getWorkOrderRecommendationsLegacy(
    @Param('id') id: string,
    @Query('title') title?: string,
    @Query('vehicle') vehicle?: string,
  ) {
    return this.analyticsService.getWorkOrderRecommendations(id, title, vehicle);
  }
}
