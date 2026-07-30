import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { DashboardController } from './analytics/dashboard.controller';
import { MaintenanceSchedulesController } from './analytics/maintenance-schedules.controller';

@Module({
  controllers: [AnalyticsController, DashboardController, MaintenanceSchedulesController],
  providers: [AnalyticsService],
})
export class AppModule {}
