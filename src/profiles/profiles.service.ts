import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private prisma: PrismaService) { }

  async findOne(userId: string) {
    try {
      let profile = await this.prisma.profiles.findUnique({
        where: { user_id: userId },
      });

      if (!profile) {
        this.logger.log(`Profile for user ${userId} not found, creating default.`);
        profile = await this.prisma.profiles.create({
          data: {
            user_id: userId,
          },
        });
      }

      return profile;
    } catch (error) {
      this.logger.error(`Error finding/creating profile for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to fetch profile');
    }
  }

  async create(createProfileDto: CreateProfileDto, userId: string) {
    try {
      const profile = await this.prisma.profiles.create({
        data: {
          ...createProfileDto,
          user_id: userId,
        },
      });
      return profile;
    } catch (error) {
      this.logger.error('Profile create error:', error);
      throw new InternalServerErrorException('Failed to create profile');
    }
  }

  async update(updateProfileDto: UpdateProfileDto, userId: string) {
    // Check if profile exists
    const existing = await this.prisma.profiles.findUnique({
      where: { user_id: userId }
    });

    try {
      if (!existing) {
        // Create profile if it doesn't exist
        return this.create(updateProfileDto as CreateProfileDto, userId);
      }

      const profile = await this.prisma.profiles.update({
        where: { user_id: userId },
        data: updateProfileDto,
      });

      return profile;
    } catch (error) {
      this.logger.error('Profile update error:', error);
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async remove(userId: string) {
    try {
      const { count } = await this.prisma.profiles.deleteMany({
        where: { user_id: userId }
      });

      if (count === 0) throw new NotFoundException('Profile not found');
      return { message: 'Profile deleted successfully' };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Profile delete error:', error);
      throw new InternalServerErrorException('Failed to delete profile');
    }
  }
}
