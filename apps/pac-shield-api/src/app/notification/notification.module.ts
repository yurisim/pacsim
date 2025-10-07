import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GameModule } from '../../game/game.module';

/**
 * Module for unified notification system
 */
@Module({
  imports: [PrismaModule, GameModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
