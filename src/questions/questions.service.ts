import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(createQuestionDto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: createQuestionDto,
    });
  }

  async findAll() {
    return this.prisma.question.findMany({
      include: {
        section: {
          select: { title: true, survey: { select: { title: true } } },
        },
        _count: { select: { options: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.question.findUnique({
      where: { id },
      include: {
        section: true,
        options: { orderBy: { order: 'asc' } },
      },
    });
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    return this.prisma.question.update({
      where: { id },
      data: updateQuestionDto,
    });
  }

  async remove(id: string) {
    return this.prisma.question.delete({
      where: { id },
    });
  }
}
