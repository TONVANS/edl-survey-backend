import { PartialType } from '@nestjs/swagger';
import { CreateTransformerSizeDto } from './create-transformer-size.dto';

export class UpdateTransformerSizeDto extends PartialType(CreateTransformerSizeDto) {}
