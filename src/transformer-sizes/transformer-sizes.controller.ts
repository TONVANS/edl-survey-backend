import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TransformerSizesService } from './transformer-sizes.service';
import { CreateTransformerSizeDto } from './dto/create-transformer-size.dto';
import { UpdateTransformerSizeDto } from './dto/update-transformer-size.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Transformer Sizes')
@Controller('transformer-sizes')
@Roles(Role.SUPER_ADMIN)
export class TransformerSizesController {
  constructor(private readonly transformerSizesService: TransformerSizesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transformer size (Super Admin only)' })
  create(@Body() createTransformerSizeDto: CreateTransformerSizeDto) {
    return this.transformerSizesService.create(createTransformerSizeDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all transformer sizes (Public)' })
  findAll() {
    return this.transformerSizesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific transformer size by ID (Public)' })
  findOne(@Param('id') id: string) {
    return this.transformerSizesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transformer size (Super Admin only)' })
  update(
    @Param('id') id: string,
    @Body() updateTransformerSizeDto: UpdateTransformerSizeDto,
  ) {
    return this.transformerSizesService.update(id, updateTransformerSizeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transformer size (Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.transformerSizesService.remove(id);
  }
}
