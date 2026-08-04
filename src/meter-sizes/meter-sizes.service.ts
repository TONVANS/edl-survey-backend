import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeterSizeDto } from './dto/create-meter-size.dto';
import { UpdateMeterSizeDto } from './dto/update-meter-size.dto';
import { FilterMeterSizeDto } from './dto/filter-meter-size.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MeterSizesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMeterSizeDto) {
    try {
      const created = await this.prisma.meterSize.create({ data: dto });
      return this.mapLabel(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(
          `Meter size with type '${dto.type}' and amps '${dto.amps}' already exists.`,
        );
      }
      throw error;
    }
  }

  async findAll(filter?: FilterMeterSizeDto) {
    const where = filter?.type ? { type: filter.type } : {};
    const sizes = await this.prisma.meterSize.findMany({
      where,
      orderBy: [{ order: 'asc' }, { type: 'asc' }, { amps: 'asc' }],
    });
    return sizes.map((s) => this.mapLabel(s));
  }

  async findOne(id: string) {
    const size = await this.prisma.meterSize.findUnique({ where: { id } });
    if (!size) throw new NotFoundException(`Meter size with ID '${id}' not found`);
    return this.mapLabel(size);
  }

  async update(id: string, dto: UpdateMeterSizeDto) {
    try {
      const updated = await this.prisma.meterSize.update({
        where: { id },
        data: dto,
      });
      return this.mapLabel(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Meter size with ID '${id}' not found`);
        }
        if (error.code === 'P2002') {
          throw new BadRequestException(
            `Meter size with this type and amps combination already exists.`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const size = await this.prisma.meterSize.findUnique({
      where: { id },
      include: { _count: { select: { meterDetails: true } } },
    });

    if (!size) {
      throw new NotFoundException(`Meter size with ID '${id}' not found`);
    }

    if (size._count.meterDetails > 0) {
      throw new BadRequestException(
        `Cannot delete meter size because it is referenced by ${size._count.meterDetails} survey response detail(s).`,
      );
    }

    const deleted = await this.prisma.meterSize.delete({ where: { id } });
    return this.mapLabel(deleted);
  }

  private mapLabel(size: any) {
    return {
      ...size,
      label: `${size.amps} (${size.type})`,
    };
  }
}
