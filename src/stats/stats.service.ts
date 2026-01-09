import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '../common/logger';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async getGlobalStats() {
    try {
      const cachedStats = await this.cacheManager.get('global_stats');
      if (cachedStats) {
        return cachedStats;
      }

      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      const res = await client.query('SELECT "chest"."get_global_stats"() as data');
      await client.end();
      const data = res.rows[0]?.data;

      if (!data) {
        throw new InternalServerErrorException('Global stats function returned no data');
      }

      // Cache for 30 minutes
      await this.cacheManager.set('global_stats', data, 1800 * 1000);

      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      Logger.error('Unexpected error in getGlobalStats:', error);
      throw new InternalServerErrorException(
        `Unexpected error fetching global stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
