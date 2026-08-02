import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { SyncService } from './analytics/sync.service';
import { DuckDbDataMartService } from './analytics/duckdb-datamart.service';
import { MaintenanceSchedulesController } from './analytics/maintenance-schedules.controller';

@Module({
  controllers: [AnalyticsController, MaintenanceSchedulesController],
  providers: [DuckDbDataMartService, AnalyticsService, SyncService],
})
export class AppModule {}
