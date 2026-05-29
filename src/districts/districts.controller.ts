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
import { DistrictsService } from './districts.service';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { DistrictQueryDto } from './dto/district-query.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Post()
  create(@Body() createDistrictDto: CreateDistrictDto) {
    return this.districtsService.create(createDistrictDto);
  }

  @Get()
  findAll(@Query() query: DistrictQueryDto) {
    return this.districtsService.findAll(query);
  }

  @Public()
  @Get('by-province/:provinceId')
  findByProvinceId(@Param('provinceId') provinceId: string) {
    return this.districtsService.findByProvinceId(provinceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.districtsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDistrictDto: UpdateDistrictDto,
  ) {
    return this.districtsService.update(id, updateDistrictDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.districtsService.remove(id);
  }
}
