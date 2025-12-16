import { Controller, Get, Post, Body, Delete, Put, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  create(@Body() createProfileDto: CreateProfileDto, @CurrentUser() user: any) {
    return this.profilesService.create(createProfileDto, user.userId);
  }

  @Get()
  findOne(@CurrentUser() user: any) {
    return this.profilesService.findOne(user.userId);
  }

  @Put()
  update(@Body() updateProfileDto: UpdateProfileDto, @CurrentUser() user: any) {
    return this.profilesService.update(updateProfileDto, user.userId);
  }

  @Delete()
  remove(@CurrentUser() user: any) {
    return this.profilesService.remove(user.userId);
  }
}

