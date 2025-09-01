import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';
import { PlayerModule } from './player/player.module';
import { LobbyModule } from './lobby/lobby.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    GameModule,
    AuthModule,
    PlayerModule,
    LobbyModule,
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
