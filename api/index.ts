import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '').split(',').filter(Boolean);

  const config = new DocumentBuilder()
    .setTitle('Test Backend API')
    .setDescription('The test backend API description')
    .setVersion('1.0')
    .addTag('health')
    .addTag('chemistry')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Test Backend API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

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
