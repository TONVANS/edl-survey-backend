import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerTypeDto } from './dto/create-customer-type.dto';
import { UpdateCustomerTypeDto } from './dto/update-customer-type.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerTypesService {
  private readonly logger = new Logger(CustomerTypesService.name);

  constructor(private prisma: PrismaService) {}

  async create(createCustomerTypeDto: CreateCustomerTypeDto) {
    try {
      return await this.prisma.customerType.create({
        data: createCustomerTypeDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `CustomerType with name "${createCustomerTypeDto.name}" already exists`,
        );
      }
      this.logger.error('Failed to create customer type:', error.message);
      throw new InternalServerErrorException('Failed to create customer type');
    }
  }

  async findAll() {
    try {
      return await this.prisma.customerType.findMany({
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ],
      });
    } catch (error) {
      this.logger.error('Failed to fetch customer types:', error.message);
      throw new InternalServerErrorException('Could not fetch customer types');
    }
  }

  async findOne(id: string) {
    const customerType = await this.prisma.customerType.findUnique({
      where: { id },
    });
    if (!customerType) {
      throw new NotFoundException(`CustomerType with ID ${id} not found`);
    }
    return customerType;
  }

  async update(id: string, updateCustomerTypeDto: UpdateCustomerTypeDto) {
    await this.findOne(id); // Ensures it exists

    try {
      return await this.prisma.customerType.update({
        where: { id },
        data: updateCustomerTypeDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `CustomerType with name "${updateCustomerTypeDto.name}" already exists`,
        );
      }
      this.logger.error('Failed to update customer type:', error.message);
      throw new InternalServerErrorException('Failed to update customer type');
    }
  }

  async remove(id: string) {
    await this.findOne(id); // Ensures it exists
    try {
      return await this.prisma.customerType.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error('Failed to delete customer type:', error.message);
      throw new InternalServerErrorException('Failed to delete customer type');
    }
  }
}
