import { Module } from '@nestjs/common';
import { VillagesService } from './villages.service';
import { VillagesController } from './villages.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VillagesService],
  controllers: [VillagesController],
})
export class VillagesModule {}
