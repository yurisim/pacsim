import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';

@Module({
  imports: [PrismaModule],
  providers: [GameService, GameGateway],
  controllers: [GameController],
})
export class GameModule {}
