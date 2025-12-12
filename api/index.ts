import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import express from 'express';
import { Request, Response } from 'express';

let cachedApp: express.Express | null = null;

async function createNestServer(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: false,
    },
  );

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'production');
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '').split(',').filter(Boolean);

  // CORS configuration
  app.enableCors({
    origin: nodeEnv === 'production' 
      ? (corsOrigins.length > 0 ? corsOrigins : false)
      : true, // Allow all origins in development
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  cachedApp = expressApp;
  return expressApp;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const app = await createNestServer();
    app(req, res);
  } catch (error) {
    console.error('Error in serverless handler:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
