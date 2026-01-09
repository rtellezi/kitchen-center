import { Module } from '@nestjs/common';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { ConfigModule } from '@nestjs/config';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [ConfigModule, ProfilesModule],
  controllers: [SharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule { }
