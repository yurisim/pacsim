import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { PlayerModule } from '../app/player/player.module';

@Module({
  imports: [PrismaModule, AuthModule, PlayerModule],
  providers: [GameService, GameGateway],
  controllers: [GameController],
  exports: [GameGateway],
})
export class GameModule {}
