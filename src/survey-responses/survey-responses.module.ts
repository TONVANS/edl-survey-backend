import { Module } from '@nestjs/common';
import { SurveyResponsesService } from './survey-responses.service';
import { SurveyResponsesController } from './survey-responses.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SurveyResponsesService],
  controllers: [SurveyResponsesController],
})
export class SurveyResponsesModule {}
