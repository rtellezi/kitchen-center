import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '../common/logger';

@Injectable()
export class StatsService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // We use service_role key to ensure we can execute the RPC if it needed elevated privileges,
    // though the RPC is security definer so anon key would work too if authorized.
    // Using service_role is safe here as this service is only called by backend.
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async getGlobalStats() {
    try {
      const cachedStats = await this.cacheManager.get('global_stats');
      if (cachedStats) {
        return cachedStats;
      }

      const { data, error } = await this.supabase.schema('chest').rpc('get_global_stats');

      if (error) {
        Logger.error('Supabase RPC error:', error);
        throw new InternalServerErrorException(
          `Failed to fetch global stats: ${error.message}. Make sure the get_global_stats() function exists in the chest schema.`
        );
      }

      if (!data) {
        throw new InternalServerErrorException('Global stats function returned no data');
      }

      // Cache for 30 minutes (1800 seconds) to balance freshness and performance
      // cache-manager v5+ uses milliseconds (usually), check version.
      // NestJS cache-manager wrapper usually handles TTL in ms.
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

