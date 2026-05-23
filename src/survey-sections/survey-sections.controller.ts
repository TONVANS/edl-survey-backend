import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SurveySectionsService } from './survey-sections.service';
import { CreateSurveySectionDto } from './dto/create-survey-section.dto';
import { UpdateSurveySectionDto } from './dto/update-survey-section.dto';

@Controller('survey-sections')
export class SurveySectionsController {
  constructor(private readonly surveySectionsService: SurveySectionsService) {}

  @Post()
  create(@Body() createSurveySectionDto: CreateSurveySectionDto) {
    return this.surveySectionsService.create(createSurveySectionDto);
  }

  @Get()
  findAll() {
    return this.surveySectionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.surveySectionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSurveySectionDto: UpdateSurveySectionDto,
  ) {
    return this.surveySectionsService.update(id, updateSurveySectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.surveySectionsService.remove(id);
  }
}
