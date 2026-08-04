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
import { MeterSizesService } from './meter-sizes.service';
import { CreateMeterSizeDto } from './dto/create-meter-size.dto';
import { UpdateMeterSizeDto } from './dto/update-meter-size.dto';
import { FilterMeterSizeDto } from './dto/filter-meter-size.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Meter Sizes')
@Controller('meter-sizes')
@Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN)
export class MeterSizesController {
  constructor(private readonly meterSizesService: MeterSizesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new meter size (Super Admin & Region Admin)' })
  @ApiResponse({ status: 201, description: 'Meter size created successfully.' })
  create(@Body() createMeterSizeDto: CreateMeterSizeDto) {
    return this.meterSizesService.create(createMeterSizeDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all meter sizes with optional type filter (Public)' })
  @ApiResponse({ status: 200, description: 'List of meter sizes returned.' })
  findAll(@Query() filter: FilterMeterSizeDto) {
    return this.meterSizesService.findAll(filter);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific meter size by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Meter size details returned.' })
  findOne(@Param('id') id: string) {
    return this.meterSizesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meter size (Super Admin & Region Admin)' })
  @ApiResponse({ status: 200, description: 'Meter size updated successfully.' })
  update(
    @Param('id') id: string,
    @Body() updateMeterSizeDto: UpdateMeterSizeDto,
  ) {
    return this.meterSizesService.update(id, updateMeterSizeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meter size (Super Admin & Region Admin)' })
  @ApiResponse({ status: 200, description: 'Meter size deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.meterSizesService.remove(id);
  }
}
