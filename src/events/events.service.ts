import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('Event not found'); // PGRST116 is JSON code for no rows
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async create(createEventDto: CreateEventDto, userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .insert({
        ...createEventDto,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    // First ensure it belongs to user (implicit in update query with eq)
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .update(updateEventDto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Event not found or not owned by user');
    
    return data;
  }

  async remove(id: string, userId: string) {
    const { error, count } = await this.supabase
      .schema('chest')
      .from('events')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    if (count === 0) throw new NotFoundException('Event not found');
    
    return { message: 'Event deleted successfully' };
  }
}

