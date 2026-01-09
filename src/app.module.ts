import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ChemistryModule } from './chemistry/chemistry.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { StatsModule } from './stats/stats.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AccountModule } from './account/account.module';
import { SharesModule } from './shares/shares.module';
import { PartnersModule } from './partners/partners.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production').default('development'),
        PORT: Joi.number().default(3000),
        HF_TOKEN: Joi.string().required(),
        HF_MODEL: Joi.string().default('meta-llama/Llama-3.1-8B-Instruct:novita'),
        HF_API_URL: Joi.string().default(
          'https://router.huggingface.co/v1/chat/completions',
        ),
        HF_MAX_TOKENS: Joi.number().default(100),
        HF_TEMPERATURE: Joi.number().default(0.95),
        // SUPABASE_URL and SUPABASE_KEY removed as we don't use supabase-js client anymore
        // SUPABASE_SERVICE_ROLE_KEY removed as well
        // We still need JWT Secret for verifying tokens if using Passport JWT with Supabase secret
        SUPABASE_JWT_SECRET: Joi.string().required(),
        CORS_ORIGINS: Joi.string().optional(),
      }),
    }),
    ChemistryModule,
    HealthModule,
    AuthModule,
    EventsModule,
    StatsModule,
    ProfilesModule,
    AccountModule,
    SharesModule,
    PartnersModule,
    PrismaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
