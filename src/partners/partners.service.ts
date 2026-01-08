import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
    private readonly logger = new Logger(PartnersService.name);
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
            .from('partners')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            this.logger.error(`Error fetching partners for user ${userId}: ${error.message}`);
            throw new InternalServerErrorException(error.message);
        }

        // Ensure "No Partner" (ID: 0) exists
        const noPartner = data.find(p => p.id === '0');
        if (!noPartner) {
            const { data: newNoPartner, error: insertError } = await this.supabase
                .schema('chest')
                .from('partners')
                .insert({
                    id: '0',
                    user_id: userId,
                    name: 'No Partner',
                    color: '#808080',
                    is_visible: true,
                    is_default: false
                })
                .select()
                .single();

            if (!insertError && newNoPartner) {
                data.push(newNoPartner);
            }
        }

        return data;
    }

    async findOne(id: string, userId: string) {
        const { data, error } = await this.supabase
            .schema('chest')
            .from('partners')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') throw new NotFoundException('Partner not found');
            throw new InternalServerErrorException(error.message);
        }
        return data;
    }

    async create(createPartnerDto: CreatePartnerDto, userId: string) {
        // If setting as default, we need to unset other defaults later or ensuring logic
        // Implementation choice: Create first, then enforce default logic if needed.
        // However, it's better to check current defaults before if we want to be strict,
        // but simplifying: Insert, then if isDefault, update others. 

        const { data, error } = await this.supabase
            .schema('chest')
            .from('partners')
            .insert({
                name: createPartnerDto.name,
                color: createPartnerDto.color || '#000000',
                is_default: createPartnerDto.isDefault || false,
                is_visible: createPartnerDto.isVisible ?? true,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Error creating partner: ${error.message}`);
            throw new InternalServerErrorException(error.message);
        }

        if (createPartnerDto.isDefault) {
            await this.ensureSingleDefault(userId, data.id);
        }

        return data;
    }

    async update(id: string, updatePartnerDto: UpdatePartnerDto, userId: string) {
        // Build update object with snake_case keys
        const updateData: any = {};
        if (updatePartnerDto.name !== undefined) updateData.name = updatePartnerDto.name;
        if (updatePartnerDto.color !== undefined) updateData.color = updatePartnerDto.color;
        if (updatePartnerDto.isDefault !== undefined) updateData.is_default = updatePartnerDto.isDefault;
        if (updatePartnerDto.isVisible !== undefined) updateData.is_visible = updatePartnerDto.isVisible;

        // Requirement: If unchecked a favorite partner, remove favorite
        if (updatePartnerDto.isVisible === false) {
            const current = await this.findOne(id, userId);
            if (current.is_default) {
                updateData.is_default = false;
                updatePartnerDto.isDefault = false; // For logic below
            }
        }

        const { data, error } = await this.supabase
            .schema('chest')
            .from('partners')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw new InternalServerErrorException(error.message);
        if (!data) throw new NotFoundException('Partner not found');

        if (updatePartnerDto.isDefault) {
            await this.ensureSingleDefault(userId, id);
        }

        return data;
    }

    async remove(id: string, userId: string) {
        const { error, count } = await this.supabase
            .schema('chest')
            .from('partners')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw new InternalServerErrorException(error.message);
        if (count === 0) throw new NotFoundException('Partner not found');

        return { message: 'Partner deleted successfully' };
    }

    /**
     * Ensures only one partner is set as default.
     * Logic: If a specific partnerId is intended to be default, unset is_default for all others.
     * If logic requires "oldest wins", it usually applies when resolving conflict without specific user action.
     * Here, if user explicitly updates one to be default, that one becomes default.
     * If multiple defaults exist (data inconsistency), we might want cleanup.
     */
    private async ensureSingleDefault(userId: string, newDefaultId: string) {
        // Unset all others
        const { error } = await this.supabase
            .schema('chest')
            .from('partners')
            .update({ is_default: false })
            .eq('user_id', userId)
            .neq('id', newDefaultId);

        if (error) {
            this.logger.error(`Error enforcing single default partner: ${error.message}`);
        }
    }
}
