import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';
import { AircraftPoolService } from './aircraft-pool.service';
import { AllocationNotificationService } from './allocation-notification.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GameModule } from '../../game/game.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GameModule), // For WebSocket integration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AllocationController],
  providers: [AllocationService, AircraftPoolService, AllocationNotificationService],
  exports: [AllocationService, AircraftPoolService, AllocationNotificationService],
})
export class AllocationModule {}
