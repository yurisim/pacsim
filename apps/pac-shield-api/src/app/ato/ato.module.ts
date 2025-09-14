import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AtoController } from './ato.controller';
import { AtoService } from './ato.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GameModule } from '../../game/game.module';

/**
 * ATO (Air Tasking Order) module for flight plan management.
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GameModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AtoController],
  providers: [AtoService],
  exports: [AtoService],
})
export class AtoModule {}
