import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ChemistryModule } from './chemistry/chemistry.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        HF_TOKEN: Joi.string().required(),
        HF_MODEL: Joi.string().default('meta-llama/Llama-3.1-8B-Instruct:novita'),
        HF_API_URL: Joi.string().default(
          'https://router.huggingface.co/v1/chat/completions',
        ),
        HF_MAX_TOKENS: Joi.number().default(100),
        HF_TEMPERATURE: Joi.number().default(0.7),
        CORS_ORIGINS: Joi.string().default('http://localhost:5173,http://localhost:3000'),
      }),
    }),
    ChemistryModule,
    HealthModule,
  ],
})
export class AppModule {}
