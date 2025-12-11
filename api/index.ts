import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
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

  const config = new DocumentBuilder()
    .setTitle('Test Backend API')
    .setDescription('The test backend API description')
    .setVersion('1.0')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors();
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

