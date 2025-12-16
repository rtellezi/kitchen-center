import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { EventsModule } from '../events/events.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [EventsModule, ProfilesModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}

