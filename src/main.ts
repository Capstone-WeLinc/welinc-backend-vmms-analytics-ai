import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('vmms/analytics');
  app.enableCors();
  await app.listen(process.env.PORT ?? 3011);
}

bootstrap();
