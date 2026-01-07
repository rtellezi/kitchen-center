import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('partners')
@UseGuards(SupabaseAuthGuard)
export class PartnersController {
    constructor(private readonly partnersService: PartnersService) { }

    @Post()
    create(@Body() createPartnerDto: CreatePartnerDto, @CurrentUser() user: any) {
        return this.partnersService.create(createPartnerDto, user.userId);
    }

    @Get()
    findAll(@CurrentUser() user: any) {
        return this.partnersService.findAll(user.userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.partnersService.findOne(id, user.userId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePartnerDto: UpdatePartnerDto, @CurrentUser() user: any) {
        return this.partnersService.update(id, updatePartnerDto, user.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.partnersService.remove(id, user.userId);
    }
}
