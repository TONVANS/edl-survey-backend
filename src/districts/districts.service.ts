import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { DistrictQueryDto } from './dto/district-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DistrictsService {
  constructor(private prisma: PrismaService) {}

  async create(createDistrictDto: CreateDistrictDto) {
    return this.prisma.district.create({
      data: createDistrictDto,
    });
  }

  async findAll(query: DistrictQueryDto) {
    const { page, limit, provinceId } = query;

    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const take = limit ?? 10;

    const where: Prisma.DistrictWhereInput = {};
    if (provinceId) where.provinceId = provinceId;

    const [data, total] = await Promise.all([
      this.prisma.district.findMany({
        where,
        include: {
          province: {
            select: { name: true },
          },
          _count: {
            select: { villages: true },
          },
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.district.count({ where }),
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
    return this.prisma.district.findUnique({
      where: { id },
      include: {
        province: true,
        villages: true,
      },
    });
  }

  async update(id: string, updateDistrictDto: UpdateDistrictDto) {
    return this.prisma.district.update({
      where: { id },
      data: updateDistrictDto,
    });
  }

  async remove(id: string) {
    return this.prisma.district.delete({
      where: { id },
    });
  }
}
