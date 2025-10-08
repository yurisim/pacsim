import { Module } from '@nestjs/common';
import { ThreatTokensController } from './threat-tokens.controller';
import { ThreatTokensService } from './threat-tokens.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ThreatTokensController],
  providers: [ThreatTokensService],
  exports: [ThreatTokensService],
})
export class ThreatTokensModule {}
