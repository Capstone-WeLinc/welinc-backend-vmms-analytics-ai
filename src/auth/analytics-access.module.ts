import { Module } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AnalyticsAccessGuard, AnalyticsResponseInterceptor } from './analytics-access';
import { AccountCheck } from './account-check';
import { TOKEN_VERIFIER } from './verify/guards';
import { ResilientKeySet } from './verify/key-set';
import { TokenVerifier } from './verify/token-verifier';

@Module({
  providers: [
    AccountCheck,
    {
      provide: TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('AuthKeys');
        return new TokenVerifier({
          issuer: config.getOrThrow<string>('AUTH_ISSUER'),
          audience: 'VMMS',
          keys: new ResilientKeySet({
            url: config.getOrThrow<string>('AUTH_JWKS_URL'),
            onFetchError: (reason) => logger.warn(`could not fetch welinc-auth keys: ${reason}`),
          }),
        });
      },
    },
    { provide: APP_GUARD, useClass: AnalyticsAccessGuard },
    { provide: APP_INTERCEPTOR, useClass: AnalyticsResponseInterceptor },
  ],
})
export class AnalyticsAccessModule {}
