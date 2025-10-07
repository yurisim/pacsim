import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { PlayerModule } from '../app/player/player.module';
import { EventsGateway } from '../app/events.gateway';
import { CountryAccessController } from './country-access.controller';
import { GameScoringService } from './scoring.service';

@Module({
  imports: [PrismaModule, AuthModule, PlayerModule],
  providers: [GameService, GameGateway, EventsGateway, GameScoringService],
  controllers: [GameController, CountryAccessController],
  exports: [GameGateway, GameScoringService],
})
export class GameModule {}
