import { Module } from '@nestjs/common';
import { FosController } from './fos.controller';
import { FosService } from './fos.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsGateway } from '../events.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [FosController],
  providers: [FosService, EventsGateway],
  exports: [FosService],
})
export class FosModule {}