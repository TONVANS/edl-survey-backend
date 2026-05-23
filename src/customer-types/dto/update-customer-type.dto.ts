import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerTypeDto } from './create-customer-type.dto';

export class UpdateCustomerTypeDto extends PartialType(CreateCustomerTypeDto) {}
