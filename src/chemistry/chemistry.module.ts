import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChemistryController } from './chemistry.controller';
import { HfChatService } from './hf-chat.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [ChemistryController],
  providers: [HfChatService],
})
export class ChemistryModule {}



