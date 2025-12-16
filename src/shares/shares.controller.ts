import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() createShareDto: CreateShareDto, @CurrentUser() user: any) {
    return this.sharesService.create(createShareDto, user.userId);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  findAll(@CurrentUser() user: any) {
    return this.sharesService.findAll(user.userId);
  }

  @Get(':token')
  getByToken(@Param('token') token: string) {
    // Public endpoint - no auth guard
    return this.sharesService.findByToken(token);
  }

  @Get(':token/events')
  getEventsByToken(@Param('token') token: string) {
    // Public endpoint - no auth guard
    return this.sharesService.getEventsByToken(token);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() updateShareDto: UpdateShareDto, @CurrentUser() user: any) {
    return this.sharesService.update(id, updateShareDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sharesService.remove(id, user.userId);
  }
}
