import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GameService } from './game.service';
import { GameController } from './game.controller';

@Module({
  imports: [PrismaModule],
  providers: [GameService],
  controllers: [GameController],
})
export class GameModule {}
