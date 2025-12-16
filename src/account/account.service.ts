import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventsService } from '../events/events.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class AccountService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private eventsService: EventsService,
    private profilesService: ProfilesService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async deleteAccount(userId: string) {
    try {
      // 1. Delete all user events
      try {
        const events = await this.eventsService.findAll(userId);
        for (const event of events) {
          await this.eventsService.remove(event.id, userId);
        }
      } catch (error) {
        console.error('Error deleting events:', error);
        // Continue with account deletion even if event deletion fails
      }

      // 2. Delete user profile
      try {
        await this.profilesService.remove(userId);
      } catch (error) {
        console.error('Error deleting profile:', error);
        // Continue with account deletion even if profile deletion fails
      }

      // 3. Delete user from Supabase auth (requires admin privileges)
      const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Error deleting auth user:', authError);
        throw new InternalServerErrorException(
          `Failed to delete user account: ${authError.message}`
        );
      }

      return {
        message: 'Account and all associated data deleted successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Unexpected error during account deletion:', error);
      throw new InternalServerErrorException(
        'Failed to delete account. Please try again or contact support.'
      );
    }
  }
}

