import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private eventsService: EventsService,
    private profilesService: ProfilesService,
    private prisma: PrismaService,
  ) { }

  async deleteAccount(userId: string) {
    try {
      // 1. Delete all user events
      try {
        const events = await this.eventsService.findAll(userId);
        for (const event of events) {
          await this.eventsService.remove(event.id, userId);
        }
      } catch (error) {
        this.logger.error('Error deleting events:', error);
        // Continue with account deletion even if event deletion fails
      }

      // 2. Delete user profile
      try {
        await this.profilesService.remove(userId);
      } catch (error) {
        this.logger.error('Error deleting profile:', error);
        // Continue with account deletion even if profile deletion fails
      }

      // 3. Delete user from Database (Prisma)
      // Since we are connected as postgres superuser (via DIRECT_URL or DATABASE_URL pooler user),
      // we should be able to delete from the auth.users table if it's mapped in Prisma.
      // Our introspect mapped 'users' in 'auth' schema.
      try {
        await this.prisma.users.delete({
          where: { id: userId }
        });
      } catch (error) {
        this.logger.error('Error deleting user record:', error);
        throw new InternalServerErrorException(
          `Failed to delete user account: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      this.logger.error('Unexpected error during account deletion:', error);
      throw new InternalServerErrorException(
        'Failed to delete account. Please try again or contact support.'
      );
    }
  }
}
