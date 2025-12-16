import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import express from 'express';
import { Request, Response } from 'express';

let cachedApp: express.Express | null = null;
let corsConfig: { origin: string | boolean | string[]; methods: string[]; allowedHeaders: string[]; credentials: boolean } | null = null;

async function createNestServer(): Promise<express.Express> {
  if (cachedApp) {
    console.log('[Vercel] Using cached NestJS app');
    return cachedApp;
  }

  console.log('[Vercel] Initializing NestJS app...');
  const expressApp = express();
  
  // Request logging middleware
  expressApp.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`, {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50),
      'content-type': req.headers['content-type'],
    });
    next();
  });

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: false,
    },
  );

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'production');
  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS', '');
  const corsOrigins = corsOriginsRaw.split(',').filter(Boolean).map(origin => origin.trim());

  console.log('[Vercel] Environment:', {
    NODE_ENV: nodeEnv,
    CORS_ORIGINS: corsOrigins.length > 0 ? corsOrigins : 'NOT SET (will allow all in dev)',
  });

  // CORS configuration
  corsConfig = {
    origin: nodeEnv === 'production' 
      ? (corsOrigins.length > 0 ? corsOrigins : false)
      : true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };

  console.log('[Vercel] CORS Config:', {
    origin: corsConfig.origin === true ? 'ALLOW_ALL' : corsConfig.origin,
    methods: corsConfig.methods,
  });

  app.enableCors(corsConfig);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.init();
  cachedApp = expressApp;
  console.log('[Vercel] NestJS app initialized successfully');
  return expressApp;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const requestId = Date.now();
  console.log(`[${requestId}] Handler called: ${req.method} ${req.url}`);
  
  try {
    const app = await createNestServer();
    
    // Handle OPTIONS preflight requests explicitly to ensure CORS headers are set correctly
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '';
      
      if (corsConfig) {
        const isAllowedOrigin = corsConfig.origin === true 
          ? true 
          : Array.isArray(corsConfig.origin) 
            ? corsConfig.origin.includes(origin)
            : corsConfig.origin === origin;
        
        if (isAllowedOrigin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
          res.setHeader('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
          res.setHeader('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
          res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        }
      }
      res.status(204).end();
      return;
    }
    
    // Add response logging using finish event
    res.on('finish', () => {
      console.log(`[${requestId}] Response: ${res.statusCode}`, {
        'content-type': res.getHeader('content-type'),
        'content-length': res.getHeader('content-length'),
      });
    });

    app(req, res);
  } catch (error) {
    console.error(`[${requestId}] Error in serverless handler:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
