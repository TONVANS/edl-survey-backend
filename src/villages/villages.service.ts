import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVillageDto } from './dto/create-village.dto';
import { UpdateVillageDto } from './dto/update-village.dto';
import { VillageQueryDto } from './dto/village-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VillagesService {
  constructor(private prisma: PrismaService) {}

  private async validateHierarchy(
    districtId: string,
    provinceId: string,
    regionId: string,
  ) {
    const district = await this.prisma.district.findFirst({
      where: {
        id: districtId,
        provinceId: provinceId,
        province: {
          regionId: regionId,
        },
      },
    });

    if (!district) {
      throw new BadRequestException(
        'Invalid hierarchy: District does not belong to the specified Province and Region.',
      );
    }
  }

  async create(createVillageDto: CreateVillageDto) {
    const { regionId, provinceId, ...villageData } = createVillageDto;

    await this.validateHierarchy(villageData.districtId, provinceId, regionId);

    return this.prisma.village.create({
      data: villageData,
    });
  }

  async findAll(query: VillageQueryDto) {
    const { page, limit, districtId } = query;

    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const take = limit ?? 10;

    const where: Prisma.VillageWhereInput = {};
    if (districtId) where.districtId = districtId;

    const [data, total] = await Promise.all([
      this.prisma.village.findMany({
        where,
        include: {
          district: {
            select: {
              name: true,
              province: {
                select: {
                  name: true,
                  region: { select: { name: true } },
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.village.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: page ?? 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const village = await this.prisma.village.findUnique({
      where: { id },
      include: {
        district: {
          include: {
            province: {
              include: { region: true },
            },
          },
        },
      },
    });

    if (!village) {
      throw new NotFoundException(`Village with ID ${id} not found`);
    }

    return village;
  }

  async findByDistrictId(districtId: string) {
    return this.prisma.village.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, updateVillageDto: UpdateVillageDto) {
    const village = await this.findOne(id);

    if (
      updateVillageDto.districtId ||
      updateVillageDto.provinceId ||
      updateVillageDto.regionId
    ) {
      const districtId = updateVillageDto.districtId || village.districtId;
      const provinceId =
        updateVillageDto.provinceId || village.district.provinceId;
      const regionId =
        updateVillageDto.regionId || village.district.province.regionId;

      await this.validateHierarchy(districtId, provinceId, regionId);
    }

    const { regionId, provinceId, ...updateData } = updateVillageDto;

    return this.prisma.village.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.village.delete({
      where: { id },
    });
  }
}
