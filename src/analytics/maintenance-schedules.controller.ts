import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsAccess } from '../auth/analytics-access';

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

  @AnalyticsAccess('assigned')
  @Get(':id')
  getSchedule(@Param('id') id: string) {
    return this.analyticsService.getScheduleWithAi(id);
  }

  @AnalyticsAccess('assigned')
  @Get(':id/ai')
  getScheduleAi(@Param('id') id: string) {
    return this.analyticsService.getScheduleWithAi(id);
  }
}
