import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class PartnersService {
    private readonly logger = new Logger(PartnersService.name);

    constructor(
        private prisma: PrismaService,
        private profilesService: ProfilesService
    ) { }

    async findAll(userId: string) {
        try {
            const profile = await this.profilesService.findOne(userId);
            const profileId = profile.id;

            const partners = await this.prisma.partners.findMany({
                where: { profile_id: profileId },
                orderBy: { created_at: 'asc' },
            });

            // Override is_default based on profile setting
            const partnersWithDefault = partners.map((p: any) => ({
                ...p,
                is_default: p.id === profile.default_partner_id
            }));

            return partnersWithDefault;
        } catch (error: any) {
            this.logger.error(`Error fetching partners for user ${userId}: ${error.message} `);
            throw new InternalServerErrorException(error.message);
        }
    }

    async findOne(id: string, userId: string) {
        try {
            const profile = await this.profilesService.findOne(userId);
            const profileId = profile.id;

            const partner = await this.prisma.partners.findUnique({
                where: { id },
            });

            if (!partner || partner.profile_id !== profileId) {
                throw new NotFoundException('Partner not found');
            }
            return partner;
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async create(createPartnerDto: CreatePartnerDto, userId: string) {
        try {
            const profile = await this.profilesService.findOne(userId);
            const profileId = profile.id;

            const partner = await this.prisma.partners.create({
                data: {
                    name: createPartnerDto.name,
                    color: createPartnerDto.color || '#000000',
                    is_visible: createPartnerDto.isVisible ?? true,
                    profile_id: profileId,
                },
            });


            if (createPartnerDto.isDefault) {
                await this.profilesService.update({ default_partner_id: partner.id }, userId);
            }

            return partner;
        } catch (error: any) {
            this.logger.error(`Error creating partner: ${error.message} `);
            throw new InternalServerErrorException(error.message);
        }
    }

    async update(id: string, updatePartnerDto: UpdatePartnerDto, userId: string) {
        // 1. Verify ownership and get current state
        const profile = await this.profilesService.findOne(userId);
        const profileId = profile.id;

        const existing = await this.prisma.partners.findUnique({ where: { id } });
        if (!existing || existing.profile_id !== profileId) {
            throw new NotFoundException('Partner not found');
        }

        try {
            const data: any = {};
            if (updatePartnerDto.name !== undefined) data.name = updatePartnerDto.name;
            if (updatePartnerDto.color !== undefined) data.color = updatePartnerDto.color;
            if (updatePartnerDto.isVisible !== undefined) data.is_visible = updatePartnerDto.isVisible;

            const updated = await this.prisma.partners.update({
                where: { id },
                data,
            });

            // Handle isDefault update
            if (updatePartnerDto.isDefault !== undefined) {
                if (updatePartnerDto.isDefault) {
                    await this.profilesService.update({ default_partner_id: id }, userId);
                } else {
                    // Check if checking off the default
                    const currentProfile = await this.profilesService.findOne(userId);
                    if (currentProfile.default_partner_id === id) {
                        await this.profilesService.update({ default_partner_id: null }, userId);
                    }
                }
            }

            // We inject is_default at response time (in findAll/findOne wrappers if needed, 
            // but update returns the raw object usually). 
            // Let's attach the computed property related to profile for consistency if needed, 
            // but for update usually returning the object is enough.
            // If frontend relies on 'isDefault' in the response of update, we might need to inject it.
            // Let's assume frontend refreshes or we can check against profile.

            const isDefault = updated.id === profile.default_partner_id;
            return { ...updated, is_default: isDefault };

        } catch (error: any) {
            this.logger.error(`Error updating partner: ${error.message} `);
            throw new InternalServerErrorException(error.message);
        }
    }

    async remove(id: string, userId: string) {
        const profile = await this.profilesService.findOne(userId);
        const profileId = profile.id;

        // Safe delete: ensure ownership
        const { count } = await this.prisma.partners.deleteMany({
            where: {
                id: id,
                profile_id: profileId
            }
        });

        if (count === 0) throw new NotFoundException('Partner not found');
        return { message: 'Partner deleted successfully' };
    }


}
