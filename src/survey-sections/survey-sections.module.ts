import { Module } from '@nestjs/common';
import { SurveySectionsService } from './survey-sections.service';
import { SurveySectionsController } from './survey-sections.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SurveySectionsService],
  controllers: [SurveySectionsController],
})
export class SurveySectionsModule {}
