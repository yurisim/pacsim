import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [PrismaModule, GameModule],
  controllers: [AppController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
