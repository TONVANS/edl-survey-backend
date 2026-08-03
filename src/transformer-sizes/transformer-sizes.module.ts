import { Module } from '@nestjs/common';
import { TransformerSizesService } from './transformer-sizes.service';
import { TransformerSizesController } from './transformer-sizes.controller';

@Module({
  controllers: [TransformerSizesController],
  providers: [TransformerSizesService],
})
export class TransformerSizesModule {}
