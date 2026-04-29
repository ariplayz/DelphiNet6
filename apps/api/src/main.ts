import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
