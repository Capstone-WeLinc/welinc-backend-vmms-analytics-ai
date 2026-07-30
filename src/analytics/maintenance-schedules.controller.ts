import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('maintenance-schedules')
export class MaintenanceSchedulesController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('search')
  searchSchedules(
    @Query('q') query: string,
    @Query('limit') limit = '6',
  ) {
    return this.analyticsService.searchMaintenanceSchedules(query, limit);
  }
}
