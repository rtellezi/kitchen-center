import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS configuration based on environment
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const allowedOrigins: string[] = [];

  // Only allow localhost in development
  if (nodeEnv !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3000',
    );
  }

  const envOrigins = configService.get<string>('CORS_ORIGINS', '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (envOrigins.length > 0) {
    allowedOrigins.push(...envOrigins);
  }

  // Log allowed origins for debugging production issues
  Logger.log(`Configured CORS Allowed Origins: ${JSON.stringify(allowedOrigins)}`);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Loose matching for production resilience: check if allowedOrigins contains the requestOrigin
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        Logger.warn(`Blocked CORS for origin: ${requestOrigin}`);
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`🚀 Kitchen Center API running on http://localhost:${port}`);
}
bootstrap();
