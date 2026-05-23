import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CustomerTypesService } from './customer-types.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCustomerTypeDto } from './dto/create-customer-type.dto';
import { UpdateCustomerTypeDto } from './dto/update-customer-type.dto';

@Controller('customer-types')
@Roles(Role.SUPER_ADMIN)
export class CustomerTypesController {
  constructor(private readonly customerTypesService: CustomerTypesService) {}

  @Post()
  async create(@Body() createCustomerTypeDto: CreateCustomerTypeDto) {
    return await this.customerTypesService.create(createCustomerTypeDto);
  }

  @Public()
  @Get()
  async findAll() {
    return await this.customerTypesService.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.customerTypesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerTypeDto: UpdateCustomerTypeDto,
  ) {
    return await this.customerTypesService.update(id, updateCustomerTypeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.customerTypesService.remove(id);
  }
}
