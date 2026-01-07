import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    controllers: [PartnersController],
    providers: [PartnersService],
    exports: [PartnersService], // Exporting in case EventsService needs it directly
})
export class PartnersModule { }
