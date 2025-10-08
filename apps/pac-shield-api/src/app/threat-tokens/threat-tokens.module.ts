import { Module } from '@nestjs/common';
import { ThreatTokensController } from './threat-tokens.controller';
import { ThreatTokensService } from './threat-tokens.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ThreatTokensController],
  providers: [ThreatTokensService],
  exports: [ThreatTokensService],
})
export class ThreatTokensModule {}
