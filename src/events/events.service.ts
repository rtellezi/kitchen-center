import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService
  ) { }

  async findAll(userId: string) {
    try {
      const profile = await this.profilesService.findOne(userId);
      const profileId = profile.id;

      // 1. Fetch events with their partners
      const events = await this.prisma.events.findMany({
        where: { profile_id: profileId },
        include: {
          event_partners: {
            include: {
              partners: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      // 2. Fetch all user partners to handle "No Partner" visibility
      // Note: PartnersService should also be refactored to use profile_id, but here we query Prisma directly.
      // We should query partners by profile_id too.
      const partners = await this.prisma.partners.findMany({
        where: { profile_id: profileId },
      });

      // Create a visibility map
      const visibilityMap = partners.reduce((acc, p) => {
        acc[p.id] = p.is_visible;
        return acc;
      }, {} as Record<string, boolean>);

      // Default "No Partner" visibility from profile settings
      const noPartnerVisible = profile.include_no_partner_events ?? true;

      // 3. Filter events based on visibility rules
      const filteredEvents = events.filter((event) => {
        // Flatten partners from event_partners relation
        const eventPartners = event.event_partners.map((ep) => ep.partners);

        if (eventPartners.length === 0) {
          // Event has no partners -> use "No Partner" visibility
          return noPartnerVisible;
        }

        // Event has partners -> visible if AT LEAST ONE is visible
        return eventPartners.some((p) => p && visibilityMap[p.id] === true);
      }).map((event) => ({
        ...event,
        // Helper to return flattened partners to frontend/client
        partners: event.event_partners.map((ep) => ep.partners),
      }));

      // Cleanup event_partners from the output
      return filteredEvents.map(({ event_partners, ...rest }) => rest);

    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const profile = await this.profilesService.findOne(userId);
      const profileId = profile.id;

      const event = await this.prisma.events.findFirst({
        where: { id, profile_id: profileId },
        include: {
          event_partners: {
            include: {
              partners: true,
            },
          },
        },
      });

      if (!event) throw new NotFoundException('Event not found');

      // Flatten partners
      const partners = event.event_partners.map((ep) => ep.partners);
      // Exclude event_partners property
      const { event_partners, ...rest } = event;

      return { ...rest, partners };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async create(createEventDto: CreateEventDto, userId: string) {
    const { partnerIds, ...eventData } = createEventDto;
    const profile = await this.profilesService.findOne(userId);
    const profileId = profile.id;

    // Use default partner if no partnerIds provided (undefined/null)
    // If [] is provided, it means explicit "No Partner"
    let finalPartnerIds = partnerIds;
    if (finalPartnerIds === undefined || finalPartnerIds === null) {
      if (profile.default_partner_id) {
        finalPartnerIds = [profile.default_partner_id];
      }
    }

    // Security check for partners (ensure they belong to the same profile)
    if (finalPartnerIds && finalPartnerIds.length > 0) {
      const userPartnersCount = await this.prisma.partners.count({
        where: {
          id: { in: finalPartnerIds },
          profile_id: profileId,
        }
      });
      if (userPartnersCount !== finalPartnerIds.length) {
        throw new InternalServerErrorException('One or more partners do not belong to you');
      }
    }

    try {
      const event = await this.prisma.events.create({
        data: {
          ...eventData,
          profile_id: profileId,
          event_partners: finalPartnerIds && finalPartnerIds.length > 0 ? {
            create: finalPartnerIds.map(pid => ({
              partners: { connect: { id: pid } }
            }))
          } : undefined
        },
        include: {
          event_partners: { include: { partners: true } }
        }
      });

      const partners = event.event_partners.map(ep => ep.partners);
      const { event_partners, ...rest } = event;
      return { ...rest, partners };

    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    const { partnerIds, ...eventUpdateData } = updateEventDto;

    const profile = await this.profilesService.findOne(userId);
    const profileId = profile.id;

    // Check ownership first
    const existing = await this.prisma.events.findFirst({ where: { id, profile_id: profileId } });
    if (!existing) throw new NotFoundException('Event not found or not owned by user');

    try {
      // Prepare partner updates if needed
      let eventPartnersUpdate: any = undefined;
      if (partnerIds !== undefined) {
        // Verify ownership of new partners
        if (partnerIds.length > 0) {
          const count = await this.prisma.partners.count({
            where: { id: { in: partnerIds }, profile_id: profileId }
          });
          if (count !== partnerIds.length) {
            throw new InternalServerErrorException('One or more partners do not belong to you');
          }
        }

        // Transactional update: delete existing links, create new ones
        eventPartnersUpdate = {
          deleteMany: {}, // Delete all associated event_partners for this event
          create: partnerIds.map(pid => ({
            partners: { connect: { id: pid } }
          }))
        };
      }

      const updatedEvent = await this.prisma.events.update({
        where: { id },
        data: {
          ...eventUpdateData,
          event_partners: eventPartnersUpdate
        },
        include: {
          event_partners: { include: { partners: true } }
        }
      });

      const partners = updatedEvent.event_partners.map(ep => ep.partners);
      const { event_partners, ...rest } = updatedEvent;
      return { ...rest, partners };

    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string, userId: string) {
    const profile = await this.profilesService.findOne(userId);
    const profileId = profile.id;

    // Delete many ensures ownership check
    const { count } = await this.prisma.events.deleteMany({
      where: { id, profile_id: profileId },
    });

    if (count === 0) throw new NotFoundException('Event not found');
    return { message: 'Event deleted successfully' };
  }
}
