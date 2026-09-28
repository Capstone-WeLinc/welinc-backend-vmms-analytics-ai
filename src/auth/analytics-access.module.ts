import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AnalyticsAccessGuard, AnalyticsResponseInterceptor } from './analytics-access';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AnalyticsAccessGuard },
    { provide: APP_INTERCEPTOR, useClass: AnalyticsResponseInterceptor },
  ],
})
export class AnalyticsAccessModule {}
