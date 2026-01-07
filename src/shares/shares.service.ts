import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async create(createShareDto: CreateShareDto, userId: string) {
    const token = randomUUID();
    const expiresAt = new Date(createShareDto.expiresAt);

    // Validate expiration is in the future
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    const { data, error } = await this.supabase
      .schema('chest')
      .from('share_links')
      .insert({
        user_id: userId,
        token,
        name: createShareDto.name || null,
        expires_at: expiresAt.toISOString(),
        date_from: createShareDto.dateFrom || null,
        date_to: createShareDto.dateTo || null,
        included_partner_ids: createShareDto.includedPartnerIds || null,
        include_no_partner_events: createShareDto.includeNoPartnerEvents ?? true, // Default true if not specified
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating share link:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new InternalServerErrorException(
        `Failed to create share link: ${error.message}${error.details ? ` (${error.details})` : ''}`
      );
    }

    // Generate share URL (frontend will construct full URL)
    const shareUrl = `/share/${token}`;

    return {
      ...data,
      shareUrl,
    };
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('share_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching share links:', {
        userId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new InternalServerErrorException(
        `Failed to fetch share links: ${error.message}${error.details ? ` (${error.details})` : ''}`
      );
    }

    // Add shareUrl to each share
    return data.map(share => ({
      ...share,
      shareUrl: `/share/${share.token}`,
    }));
  }

  async findByToken(token: string) {
    const { data, error } = await this.supabase
      .schema('chest')
      .from('share_links')
      .select('id, name, expires_at, date_from, date_to, created_at, included_partner_ids, include_no_partner_events')
      .eq('token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('Share link not found');
      this.logger.error('Error finding share link by token:', {
        token,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new InternalServerErrorException(
        `Failed to find share link: ${error.message}${error.details ? ` (${error.details})` : ''}`
      );
    }

    // Validate expiration
    const expiresAt = new Date(data.expires_at);
    if (expiresAt <= new Date()) {
      throw new NotFoundException('Share link has expired');
    }

    return data;
  }

  async getEventsByToken(token: string) {
    // Get share link with user_id and date filters in one query
    const { data: shareData, error: shareError } = await this.supabase
      .schema('chest')
      .from('share_links')
      .select('user_id, date_from, date_to, expires_at, included_partner_ids, include_no_partner_events')
      .eq('token', token)
      .single();

    if (shareError) {
      if (shareError.code === 'PGRST116') throw new NotFoundException('Share link not found');
      this.logger.error('Error getting share link for events:', {
        token,
        error: shareError.message,
        code: shareError.code,
        details: shareError.details,
        hint: shareError.hint,
      });
      throw new InternalServerErrorException(
        `Failed to get share link: ${shareError.message}${shareError.details ? ` (${shareError.details})` : ''}`
      );
    }

    if (!shareData) {
      throw new NotFoundException('Share link not found');
    }

    // Validate expiration
    const expiresAt = new Date(shareData.expires_at);
    if (expiresAt <= new Date()) {
      throw new NotFoundException('Share link has expired');
    }

    // Build query for events, including partners
    let query = this.supabase
      .schema('chest')
      .from('events')
      .select('*, partners:event_partners(partner:partners(*))') // Join partners
      .eq('user_id', shareData.user_id)
      .order('date', { ascending: true });

    // Apply date range filter if specified
    if (shareData.date_from) {
      query = query.gte('date', shareData.date_from);
    }
    if (shareData.date_to) {
      query = query.lte('date', shareData.date_to);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching events for share link:', {
        token,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new InternalServerErrorException(
        `Failed to fetch events: ${error.message}${error.details ? ` (${error.details})` : ''}`
      );
    }

    // Filter events based on partners whitelisting
    const includedPartnerIds = shareData.included_partner_ids || [];
    const includeNoPartnerEvents = shareData.include_no_partner_events;

    const filteredEvents = (data || [])
      .map((event: any) => {
        const partners = event.partners?.map((p: any) => p.partner) || [];
        return { ...event, partners };
      })
      .filter((event: any) => {
        const partners = event.partners;
        if (partners.length === 0) {
          return includeNoPartnerEvents;
        }
        // If has partners, check if specific partners are included OR if whitelist is empty/null which might imply "all" 
        // BUT requirement says "selection 0-many to filter out events". 
        // "if all/none selected, events without partners will be shown". 
        // Let's stick to explicit whitelist: if includedPartnerIds has IDs, event must match. 
        // If includedPartnerIds is empty array -> Assume NO partners are whitelisted -> only show if no partners (handled above)
        // Wait, if "none selected" -> probably means empty list.

        // Logic:
        // return partners.some(p => includedPartnerIds.includes(p.id));
        if (includedPartnerIds.length === 0) return false; // If nothing whitelisted, and event has partners, hide it.

        return partners.some((p: any) => includedPartnerIds.includes(p.id));
      });

    return filteredEvents;
  }

  async update(id: string, updateShareDto: UpdateShareDto, userId: string) {
    // Validate expiration if provided
    if (updateShareDto.expiresAt) {
      const expiresAt = new Date(updateShareDto.expiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    const updateData: any = {};
    if (updateShareDto.name !== undefined) updateData.name = updateShareDto.name || null;
    if (updateShareDto.expiresAt) updateData.expires_at = new Date(updateShareDto.expiresAt).toISOString();
    if (updateShareDto.dateFrom !== undefined) updateData.date_from = updateShareDto.dateFrom || null;
    if (updateShareDto.dateTo !== undefined) updateData.date_to = updateShareDto.dateTo || null;
    if (updateShareDto.includedPartnerIds !== undefined) updateData.included_partner_ids = updateShareDto.includedPartnerIds;
    if (updateShareDto.includeNoPartnerEvents !== undefined) updateData.include_no_partner_events = updateShareDto.includeNoPartnerEvents;

    const { data, error } = await this.supabase
      .schema('chest')
      .from('share_links')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Error updating share link:', {
        id,
        userId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new InternalServerErrorException(
        `Failed to update share link: ${error.message}${error.details ? ` (${error.details})` : ''}`
      );
    }
    if (!data) throw new NotFoundException('Share link not found or not owned by user');

    return {
      ...data,
      shareUrl: `/share/${data.token}`,
    };
  }

  async remove(id: string, userId: string) {
    const { error, count } = await this.supabase
      .schema('chest')
      .from('share_links')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Error deleting share link:', {
        id,
        userId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new InternalServerErrorException(
        `Failed to delete share link: ${error.message}${error.details ? ` (${error.details})` : ''}`
      );
    }
    if (count === 0) throw new NotFoundException('Share link not found');

    return { message: 'Share link deleted successfully' };
  }
}
