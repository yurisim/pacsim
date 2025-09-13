import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AtoController } from './ato.controller';
import { AtoService } from './ato.service';
import { GameGateway } from '../../game/game.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * ATO (Air Tasking Order) module for flight plan management.
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AtoController],
  providers: [AtoService, GameGateway],
  exports: [AtoService],
})
export class AtoModule {}
