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
import { ClsModule } from 'nestjs-cls';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TeamModule } from './team/team.module';
import { FosModule } from './fos/fos.module';
import { AtoModule } from './ato/ato.module';
import { AllocationModule } from './allocation/allocation.module';
import { NotificationModule } from './notification/notification.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? [
            '.env.production',
          ]
          : ['.env'],
      ignoreEnvFile: false,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: any) =>
          req.headers['x-request-id'] || req.headers.get?.('x-request-id') ||
          `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      },
    }),
    // Schedule module for cron jobs (cleanup)
    ScheduleModule.forRoot(),
    // Rate limiting: Only enabled in production
    // Disabled in development and test environments to prevent 429 errors
    ...(process.env.NODE_ENV === 'production' ? [
      ThrottlerModule.forRoot([
        {
          name: 'burst',
          ttl: 1000, // 1 second
          limit: 100, // Reasonable burst limit
        },
        {
          name: 'sustained',
          ttl: 60000, // 1 minute
          limit: 1000, // Reasonable sustained rate
        },
        {
          name: 'hourly',
          ttl: 3600000, // 1 hour
          limit: 10000, // Reasonable hourly limit
        },
      ]),
    ] : []),
    PrismaModule,
    GameModule,
    AuthModule,
    PlayerModule,
    LobbyModule,
    TeamModule,
    FosModule,
    AtoModule,
    AllocationModule,
    NotificationModule,
    CleanupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EventsGateway,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Throttler guard only active in production environment
    ...(process.env.NODE_ENV === 'production' ? [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ] : []),
  ],
})
export class AppModule { }
