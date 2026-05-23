import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Injectable()
export class AnswersService {
  constructor(private prisma: PrismaService) {}

  async create(createAnswerDto: CreateAnswerDto) {
    const { optionIds, ...answerData } = createAnswerDto;

    return this.prisma.answer.create({
      data: {
        ...answerData,
        selectedOptions: {
          create: optionIds?.map((optionId) => ({
            optionId,
          })),
        },
      },
    });
  }

  async findAll() {
    return this.prisma.answer.findMany({
      include: {
        question: { select: { text: true } },
        selectedOptions: { include: { option: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.answer.findUnique({
      where: { id },
      include: {
        question: true,
        selectedOptions: { include: { option: true } },
      },
    });
  }

  async update(id: string, updateAnswerDto: UpdateAnswerDto) {
    const { optionIds, ...answerData } = updateAnswerDto;

    return this.prisma.answer.update({
      where: { id },
      data: {
        ...answerData,
        selectedOptions: optionIds
          ? {
              deleteMany: {},
              create: optionIds.map((optionId) => ({
                optionId,
              })),
            }
          : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.answer.delete({
      where: { id },
    });
  }
}
