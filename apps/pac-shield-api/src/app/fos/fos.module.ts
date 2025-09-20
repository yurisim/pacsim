import { Module } from '@nestjs/common';
import { FosController } from './fos.controller';
import { FosService } from './fos.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsGateway } from '../events.gateway';
import { AuthModule } from '../../auth/auth.module';
import { MobCommanderGuard } from '../auth/mob-commander.guard';
import { FosManagementGuard } from '../auth/fos-management.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FosController],
  providers: [FosService, EventsGateway, MobCommanderGuard, FosManagementGuard],
  exports: [FosService],
})
export class FosModule { }
