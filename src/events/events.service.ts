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
    // Select events and join partners via event_partners
    // We want all event columns + partner info
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .select('*, partners:event_partners(partner:partners(*))')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);

    // Transform data to flatten structure and apply visibility filter
    // Shape from Supabase: { ..., partners: [ { partner: { id, is_visible, ... } } ] }
    const visibleEvents = data
      .map((event: any) => {
        // Flatten partners
        const partners = event.partners?.map((p: any) => p.partner) || [];
        // Check visibility: if ANY partner is hidden (is_visible = false), hide event?
        // OR: interpret "select the partners to filter out event" -> User unchecks partner in settings -> partner.is_visible = false -> filter out events with this partner.
        const isHidden = partners.some((p: any) => p.is_visible === false);
        return { ...event, partners, isHidden };
      })
      .filter((event) => !event.isHidden);

    return visibleEvents; // Return only visible events
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .select('*, partners:event_partners(partner:partners(*))')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('Event not found'); // PGRST116 is JSON code for no rows
      throw new InternalServerErrorException(error.message);
    }

    // Flatten partners similar to findAll
    const partners = data.partners?.map((p: any) => p.partner) || [];
    return { ...data, partners };
  }

  async create(createEventDto: CreateEventDto, userId: string) {
    const { partnerIds, ...eventData } = createEventDto;

    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .insert({
        ...eventData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    if (partnerIds && partnerIds.length > 0) {
      const { error: partnersError } = await this.supabase
        .schema('chest')
        .from('event_partners')
        .insert(
          partnerIds.map((pid) => ({
            event_id: data.id,
            partner_id: pid,
          }))
        );

      if (partnersError) {
        // Log error but don't fail the active event creation? Or fail?
        // Since it's a creation, strict consistency is better.
        throw new InternalServerErrorException('Failed to add partners: ' + partnersError.message);
      }
    }

    return this.findOne(data.id, userId); // Return complete object with partners
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    const { partnerIds, ...eventUpdateData } = updateEventDto;

    // First ensure it belongs to user (implicit in update query with eq)
    const { data, error } = await this.supabase
      .schema('chest')
      .from('events')
      .update(eventUpdateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Event not found or not owned by user');

    // Update partners if provided (replace all)
    if (partnerIds !== undefined) {
      // Delete existing
      await this.supabase
        .schema('chest')
        .from('event_partners')
        .delete()
        .eq('event_id', id);

      // Insert new
      if (partnerIds.length > 0) {
        const { error: partnersError } = await this.supabase
          .schema('chest')
          .from('event_partners')
          .insert(
            partnerIds.map((pid) => ({
              event_id: id,
              partner_id: pid,
            }))
          );
        if (partnersError) throw new InternalServerErrorException('Failed to update partners: ' + partnersError.message);
      }
    }

    return this.findOne(id, userId);
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

