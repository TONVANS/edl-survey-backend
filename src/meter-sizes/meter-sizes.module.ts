import { Module } from '@nestjs/common';
import { MeterSizesService } from './meter-sizes.service';
import { MeterSizesController } from './meter-sizes.controller';

@Module({
  controllers: [MeterSizesController],
  providers: [MeterSizesService],
  exports: [MeterSizesService],
})
export class MeterSizesModule {}
