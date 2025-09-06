import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsGateway } from '../events.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [TeamController],
  providers: [TeamService, EventsGateway],
  exports: [TeamService],
})
export class TeamModule {}
