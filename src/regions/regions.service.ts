import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  async create(createRegionDto: CreateRegionDto) {
    return this.prisma.region.create({
      data: createRegionDto,
    });
  }

  async findAll() {
    return this.prisma.region.findMany({
      include: {
        _count: {
          select: { provinces: true },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.region.findUnique({
      where: { id },
      include: {
        provinces: true,
      },
    });
  }

  async update(id: string, updateRegionDto: UpdateRegionDto) {
    return this.prisma.region.update({
      where: { id },
      data: updateRegionDto,
    });
  }

  async remove(id: string) {
    return this.prisma.region.delete({
      where: { id },
    });
  }
}
