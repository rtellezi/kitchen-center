import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async findOne(userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No profile found, return null (not an error)
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async create(createProfileDto: CreateProfileDto, userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('profiles')
      .insert({
        ...createProfileDto,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Profile create error:', error);
      throw new InternalServerErrorException(
        `Failed to create profile: ${error.message} (Code: ${error.code || 'unknown'})`
      );
    }
    return data;
  }

  async update(updateProfileDto: UpdateProfileDto, userId: string) {
    // Check if profile exists
    const existing = await this.findOne(userId);
    
    if (!existing) {
      // Create profile if it doesn't exist
      return this.create(updateProfileDto, userId);
    }

    // Update existing profile
    const { data, error } = await this.supabase
      .schema('chest')
      .from('profiles')
      .update(updateProfileDto)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      throw new InternalServerErrorException(
        `Failed to update profile: ${error.message} (Code: ${error.code || 'unknown'})`
      );
    }
    if (!data) throw new NotFoundException('Profile not found or not owned by user');
    
    return data;
  }

  async remove(userId: string) {
    const { error, count } = await this.supabase
      .schema('chest')
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    if (count === 0) throw new NotFoundException('Profile not found');
    
    return { message: 'Profile deleted successfully' };
  }
}

