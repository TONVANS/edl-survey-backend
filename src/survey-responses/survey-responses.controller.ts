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
import { SurveyResponsesService } from './survey-responses.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { UpdateSurveyResponseDto } from './dto/update-survey-response.dto';
import { SurveyResponseQueryDto } from './dto/survey-response-query.dto';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('survey-responses')
export class SurveyResponsesController {
  constructor(
    private readonly surveyResponsesService: SurveyResponsesService,
  ) {}

  @Public()
  @Post()
  create(@Body() createSurveyResponseDto: CreateSurveyResponseDto) {
    return this.surveyResponsesService.create(createSurveyResponseDto);
  }

  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @Get()
  findAll(
    @Query() query: SurveyResponseQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.surveyResponsesService.findAll(query, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    // In a real app, also apply data visibility checks in findOne
    return this.surveyResponsesService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSurveyResponseDto: UpdateSurveyResponseDto,
  ) {
    return this.surveyResponsesService.update(id, updateSurveyResponseDto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.surveyResponsesService.remove(id);
  }
}
