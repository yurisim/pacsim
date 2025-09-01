import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from '../events.gateway';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [PlayerController],
  providers: [PlayerService, EventsGateway],
  exports: [PlayerService],
})
export class PlayerModule {}
