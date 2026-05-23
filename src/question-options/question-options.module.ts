import { Module } from '@nestjs/common';
import { QuestionOptionsService } from './question-options.service';
import { QuestionOptionsController } from './question-options.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [QuestionOptionsService],
  controllers: [QuestionOptionsController],
})
export class QuestionOptionsModule {}
