import { PartialType } from '@nestjs/swagger';
import { CreateMeterSizeDto } from './create-meter-size.dto';

export class UpdateMeterSizeDto extends PartialType(CreateMeterSizeDto) {}
