import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('analytics', {
    exclude: ['maintenance-schedules/search'],
  });
  app.enableCors();
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
