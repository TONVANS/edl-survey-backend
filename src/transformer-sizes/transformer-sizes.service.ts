import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransformerSizeDto } from './dto/create-transformer-size.dto';
import { UpdateTransformerSizeDto } from './dto/update-transformer-size.dto';

@Injectable()
export class TransformerSizesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransformerSizeDto) {
    const created = await this.prisma.transformerSize.create({ data: dto });
    return this.mapLabel(created);
  }

  async findAll() {
    const sizes = await this.prisma.transformerSize.findMany({
      orderBy: [{ order: 'asc' }, { sizeKVA: 'asc' }],
    });
    return sizes.map(this.mapLabel);
  }

  async findOne(id: string) {
    const size = await this.prisma.transformerSize.findUnique({ where: { id } });
    if (!size) throw new NotFoundException('Transformer size not found');
    return this.mapLabel(size);
  }

  async update(id: string, dto: UpdateTransformerSizeDto) {
    const updated = await this.prisma.transformerSize.update({
      where: { id },
      data: dto,
    });
    return this.mapLabel(updated);
  }

  async remove(id: string) {
    const deleted = await this.prisma.transformerSize.delete({ where: { id } });
    return this.mapLabel(deleted);
  }

  private mapLabel(size: any) {
    return {
      ...size,
      label: `${size.sizeKVA} kVA`,
    };
  }
}
