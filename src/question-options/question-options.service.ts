import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionOptionDto } from './dto/create-question-option.dto';
import { UpdateQuestionOptionDto } from './dto/update-question-option.dto';

@Injectable()
export class QuestionOptionsService {
  constructor(private prisma: PrismaService) {}

  async create(createQuestionOptionDto: CreateQuestionOptionDto) {
    return this.prisma.questionOption.create({
      data: createQuestionOptionDto,
    });
  }

  async findAll() {
    return this.prisma.questionOption.findMany({
      include: {
        question: { select: { text: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.questionOption.findUnique({
      where: { id },
      include: {
        question: true,
      },
    });
  }

  async update(id: string, updateQuestionOptionDto: UpdateQuestionOptionDto) {
    return this.prisma.questionOption.update({
      where: { id },
      data: updateQuestionOptionDto,
    });
  }

  async remove(id: string) {
    return this.prisma.questionOption.delete({
      where: { id },
    });
  }
}
