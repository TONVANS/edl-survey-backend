import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { ProvinceQueryDto } from './dto/province-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProvincesService {
  constructor(private prisma: PrismaService) {}

  async create(createProvinceDto: CreateProvinceDto) {
    return this.prisma.province.create({
      data: createProvinceDto,
    });
  }

  async findAll(query: ProvinceQueryDto) {
    const { page, limit, regionId } = query;

    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const take = limit ?? 10;

    const where: Prisma.ProvinceWhereInput = {};
    if (regionId) where.regionId = regionId;

    const [data, total] = await Promise.all([
      this.prisma.province.findMany({
        where,
        include: {
          region: {
            select: { name: true },
          },
          _count: {
            select: { districts: true },
          },
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.province.count({ where }),
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
    return this.prisma.province.findUnique({
      where: { id },
      include: {
        region: true,
        districts: true,
      },
    });
  }

  async update(id: string, updateProvinceDto: UpdateProvinceDto) {
    return this.prisma.province.update({
      where: { id },
      data: updateProvinceDto,
    });
  }

  async remove(id: string) {
    return this.prisma.province.delete({
      where: { id },
    });
  }
}
