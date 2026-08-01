import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { SyncService } from './analytics/sync.service';
import { DuckDbDataMartService } from './analytics/duckdb-datamart.service';
import { DashboardController } from './analytics/dashboard.controller';
import { MaintenanceSchedulesController } from './analytics/maintenance-schedules.controller';

@Module({
  controllers: [AnalyticsController, DashboardController, MaintenanceSchedulesController],
  providers: [DuckDbDataMartService, AnalyticsService, SyncService],
})
export class AppModule {}
