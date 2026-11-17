import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { SyncService } from './analytics/sync.service';
import { DuckDbDataMartService } from './analytics/duckdb-datamart.service';
import { MaintenanceSchedulesController } from './analytics/maintenance-schedules.controller';
import { GeminiAiService } from './analytics/gemini-ai.service';
import { VehicleKpiService } from './analytics/vehicle-kpi.service';
import { WorkOrderAnalyticsService } from './analytics/work-order-analytics.service';
import { AnalyticsAccessModule } from './auth/analytics-access.module';
import { validateEnv } from './config/env';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), AnalyticsAccessModule],
  controllers: [AnalyticsController, MaintenanceSchedulesController],
  providers: [
    DuckDbDataMartService,
    GeminiAiService,
    VehicleKpiService,
    WorkOrderAnalyticsService,
    AnalyticsService,
    SyncService,
  ],
})
export class AppModule {}
