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
    // 1. Fetch events with their partners
    const { data: events, error: eventsError } = await this.supabase
      .schema('chest')
      .from('events')
      .select('*, partners:event_partners(partner:partners(*))')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (eventsError) throw new InternalServerErrorException(eventsError.message);

    // 2. Fetch all user partners to handle "No Partner" visibility and other filters
    const { data: partners, error: partnersError } = await this.supabase
      .schema('chest')
      .from('partners')
      .select('*')
      .eq('user_id', userId);

    if (partnersError) throw new InternalServerErrorException(partnersError.message);

    // Create a visibility map for easy lookup
    const visibilityMap = (partners || []).reduce((acc: Record<string, boolean>, p: any) => {
      acc[p.id] = p.is_visible;
      return acc;
    }, {});

    // Default "No Partner" (ID: 0) visibility to true if the row doesn't exist yet
    const noPartnerVisible = visibilityMap['0'] !== undefined ? visibilityMap['0'] : true;

    // 3. Filter events based on visibility rules
    const filteredEvents = events.filter((event: any) => {
      const flattenedPartners = event.partners?.map((p: any) => p.partner) || [];

      if (flattenedPartners.length === 0) {
        // Event has no partners -> use "No Partner" visibility
        return noPartnerVisible;
      }

      // Event has partners -> visible if AT LEAST ONE of its partners is visible
      return flattenedPartners.some((p: any) => p && visibilityMap[p.id] === true);
    }).map((event: any) => ({
      ...event,
      partners: event.partners?.map((p: any) => p.partner) || []
    }));

    return filteredEvents;
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
      // Security check: Ensure all partnerIds belong to the user
      const { data: userPartners, error: verifyError } = await this.supabase
        .schema('chest')
        .from('partners')
        .select('id')
        .eq('user_id', userId)
        .in('id', partnerIds);

      if (verifyError) throw new InternalServerErrorException('Failed to verify partners');
      if (userPartners.length !== partnerIds.length) {
        throw new InternalServerErrorException('One or more partners do not belong to you');
      }

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
        // Security check: Ensure all partnerIds belong to the user
        const { data: userPartners, error: verifyError } = await this.supabase
          .schema('chest')
          .from('partners')
          .select('id')
          .eq('user_id', userId)
          .in('id', partnerIds);

        if (verifyError) throw new InternalServerErrorException('Failed to verify partners');
        if (userPartners.length !== partnerIds.length) {
          throw new InternalServerErrorException('One or more partners do not belong to you');
        }

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

