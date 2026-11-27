import { Body, Controller, Get, Param, Post, Query, ServiceUnavailableException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SyncService } from './sync.service';
import { AnalyticsAccess } from '../auth/analytics-access';

@Controller()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly syncService: SyncService,
  ) {}

  @AnalyticsAccess('admin')
  @Post(['sync', 'analytics/sync'])
  async triggerSync() {
    return this.syncService.syncNow();
  }

  @AnalyticsAccess('public')
  @Get('health')
  async getHealth() {
    if (!(await this.syncService.checkDatabase())) {
      throw new ServiceUnavailableException({ status: 'unavailable', service: 'welinc-backend-vmms-analytics-ai', database: 'failed' });
    }
    return { status: 'ok', service: 'welinc-backend-vmms-analytics-ai', database: 'ok', mode: 'microservice', port: process.env['PORT'] ?? 3001 };
  }

  @Get(['data-health', 'analytics/data-health'])
  getDataHealth() {
    return this.syncService.getDataHealth();
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
    const dataHealth = await this.syncService.getDataHealth();
    return this.analyticsService.getAiInsights(dataHealth.state === 'current');
  }

  @Get('analytics/insights')
  async getAiInsightsLegacy() {
    const dataHealth = await this.syncService.getDataHealth();
    return this.analyticsService.getAiInsights(dataHealth.state === 'current');
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

  @AnalyticsAccess('assigned')
  @Get('workorders/item/:id')
  getWorkOrderItem(@Param('id') id: string) {
    return this.analyticsService.getWorkOrderById(id);
  }

  @AnalyticsAccess('assigned')
  @Get('analytics/workorders/item/:id')
  getWorkOrderItemLegacy(@Param('id') id: string) {
    return this.analyticsService.getWorkOrderById(id);
  }

  @AnalyticsAccess('assigned-ai')
  @Get('workorders/recommendations/:id')
  getWorkOrderRecommendations(
    @Param('id') id: string,
    @Query('title') queryTitle?: string,
    @Query('vehicle') queryVehicle?: string,
    @Query('items') itemsQuery?: string,
    @Body() body?: { title?: string; vehicle?: string; checklistItems?: Array<{ text: string }> },
  ) {
    const title = body?.title || queryTitle;
    const vehicle = body?.vehicle || queryVehicle;
    const checklistItems =
      body?.checklistItems ||
      (itemsQuery ? itemsQuery.split('|').filter(Boolean).map((text) => ({ text })) : undefined);
    return this.analyticsService.getWorkOrderRecommendations(id, title, vehicle, checklistItems);
  }

  @AnalyticsAccess('assigned-ai')
  @Post('workorders/recommendations/:id')
  postWorkOrderRecommendations(
    @Param('id') id: string,
    @Body() body?: { title?: string; vehicle?: string; checklistItems?: Array<{ text: string }> },
  ) {
    return this.analyticsService.getWorkOrderRecommendations(id, body?.title, body?.vehicle, body?.checklistItems);
  }
}
