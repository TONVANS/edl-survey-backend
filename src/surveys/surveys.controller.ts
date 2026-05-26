import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SurveyQueryDto } from './dto/survey-query.dto';

@Controller('surveys')
@Roles(Role.SUPER_ADMIN)
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(@Body() createSurveyDto: CreateSurveyDto) {
    return this.surveysService.create(createSurveyDto);
  }

  @Get()
  findAll(@Query() query: SurveyQueryDto) {
    return this.surveysService.findAll(query);
  }

  @Public()
  @Get('active')
  findActive(@Query('surveyId') surveyId?: string) {
    return this.surveysService.findActive(surveyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.surveysService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSurveyDto: UpdateSurveyDto) {
    return this.surveysService.update(id, updateSurveyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.surveysService.remove(id);
  }
}
