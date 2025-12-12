import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import express from 'express';
import { Request, Response } from 'express';

const server = express();

const createNestServer = async (expressInstance: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '').split(',');

  const config = new DocumentBuilder()
    .setTitle('Test Backend API')
    .setDescription('The test backend API description')
    .setVersion('1.0')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.init();
  return app;
};

let appPromise: Promise<any> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!appPromise) {
    appPromise = createNestServer(server);
  }
  await appPromise;
  server(req, res);
}
