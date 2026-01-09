import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService
  ) { }

  async create(createShareDto: CreateShareDto, userId: string) {
    const token = randomUUID();
    const expiresAt = new Date(createShareDto.expiresAt);

    // Validate expiration is in the future
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    try {
      const profile = await this.profilesService.findOne(userId);
      const profileId = profile.id;

      const share = await this.prisma.share_links.create({
        data: {
          profile_id: profileId,
          token,
          name: createShareDto.name || null,
          expires_at: expiresAt,
          date_from: createShareDto.dateFrom ? new Date(createShareDto.dateFrom) : null,
          date_to: createShareDto.dateTo ? new Date(createShareDto.dateTo) : null,
          included_partner_ids: createShareDto.includedPartnerIds || [],
          include_no_partner_events: createShareDto.includeNoPartnerEvents ?? true,
        },
      });

      return {
        ...share,
        shareUrl: `/share/${token}`,
      };
    } catch (error) {
      this.logger.error('Error creating share link:', error);
      throw new InternalServerErrorException('Failed to create share link');
    }
  }

  async findAll(userId: string) {
    try {
      const profile = await this.profilesService.findOne(userId);
      const profileId = profile.id;

      const shares = await this.prisma.share_links.findMany({
        where: { profile_id: profileId },
        orderBy: { created_at: 'desc' },
      });

      return shares.map(share => ({
        ...share,
        shareUrl: `/share/${share.token}`,
      }));
    } catch (error) {
      this.logger.error('Error fetching share links:', error);
      throw new InternalServerErrorException('Failed to fetch share links');
    }
  }

  async findByToken(token: string) {
    try {
      const share = await this.prisma.share_links.findUnique({
        where: { token },
        select: {
          id: true,
          name: true,
          expires_at: true,
          date_from: true,
          date_to: true,
          created_at: true,
          included_partner_ids: true,
          include_no_partner_events: true,
        }
      });

      if (!share) throw new NotFoundException('Share link not found');

      // Validate expiration
      if (new Date(share.expires_at) <= new Date()) {
        throw new NotFoundException('Share link has expired');
      }

      return share;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error finding share link by token:', error);
      throw new InternalServerErrorException('Failed to find share link');
    }
  }

  async getEventsByToken(token: string) {
    try {
      // Get share link details
      const shareData = await this.prisma.share_links.findUnique({
        where: { token },
        select: {
          profile_id: true,
          date_from: true,
          date_to: true,
          expires_at: true,
          included_partner_ids: true,
          include_no_partner_events: true
        }
      });

      if (!shareData) throw new NotFoundException('Share link not found');

      // Validate expiration
      if (new Date(shareData.expires_at) <= new Date()) {
        throw new NotFoundException('Share link has expired');
      }

      // Build query for events
      const whereClause: any = {
        profile_id: shareData.profile_id, // Switch to profile_id
      };

      if (shareData.date_from) {
        whereClause.date = { ...whereClause.date, gte: shareData.date_from };
      }
      if (shareData.date_to) {
        whereClause.date = { ...whereClause.date, lte: shareData.date_to };
      }

      const events = await this.prisma.events.findMany({
        where: whereClause,
        include: {
          event_partners: {
            include: {
              partners: true
            }
          }
        },
        orderBy: { date: 'asc' }
      });

      // Filter events based on partners rules
      const includedPartnerIds = shareData.included_partner_ids || [];
      const includeNoPartnerEvents = shareData.include_no_partner_events;

      const filteredEvents = events.map((event) => {
        // Flatten partners
        const partners = event.event_partners.map((ep) => ep.partners);
        // Remove event_partners from object to match expected output if needed, or just attach mapped partners
        // We'll return a clean object with 'partners' array
        return { ...event, partners };
      }).filter((event) => {
        const partners = event.partners;

        if (partners.length === 0) {
          return includeNoPartnerEvents;
        }

        if (includedPartnerIds.length === 0) return false;

        return partners.some((p) => includedPartnerIds.includes(p.id));
      });

      // Clean up the `event_partners` property from the mapped result above
      return filteredEvents.map(({ event_partners, ...rest }) => rest);

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error fetching events for share link:', error);
      throw new InternalServerErrorException('Failed to fetch events');
    }
  }

  async update(id: string, updateShareDto: UpdateShareDto, userId: string) {
    // Validate expiration if provided
    if (updateShareDto.expiresAt) {
      if (new Date(updateShareDto.expiresAt) <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    const profile = await this.profilesService.findOne(userId);
    const profileId = profile.id;

    // Check ownership
    const existing = await this.prisma.share_links.findFirst({
      where: { id, profile_id: profileId }
    });
    if (!existing) throw new NotFoundException('Share link not found or not owned by user');

    try {
      const updateData: any = {};
      if (updateShareDto.name !== undefined) updateData.name = updateShareDto.name || null;
      if (updateShareDto.expiresAt) updateData.expires_at = new Date(updateShareDto.expiresAt); // Prisma takes Date object
      if (updateShareDto.dateFrom !== undefined) updateData.date_from = updateShareDto.dateFrom ? new Date(updateShareDto.dateFrom) : null;
      if (updateShareDto.dateTo !== undefined) updateData.date_to = updateShareDto.dateTo ? new Date(updateShareDto.dateTo) : null;
      if (updateShareDto.includedPartnerIds !== undefined) updateData.included_partner_ids = updateShareDto.includedPartnerIds;
      if (updateShareDto.includeNoPartnerEvents !== undefined) updateData.include_no_partner_events = updateShareDto.includeNoPartnerEvents;

      const updatedShare = await this.prisma.share_links.update({
        where: { id },
        data: updateData,
      });

      return {
        ...updatedShare,
        shareUrl: `/share/${updatedShare.token}`
      };

    } catch (error) {
      this.logger.error('Error updating share link:', error);
      throw new InternalServerErrorException('Failed to update share link');
    }
  }

  async remove(id: string, userId: string) {
    const profile = await this.profilesService.findOne(userId);
    const profileId = profile.id;

    try {
      const { count } = await this.prisma.share_links.deleteMany({
        where: { id, profile_id: profileId }
      });

      if (count === 0) throw new NotFoundException('Share link not found');
      return { message: 'Share link deleted successfully' };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error deleting share link:', error);
      throw new InternalServerErrorException('Failed to delete share link');
    }
  }
}
