import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { CleanupController } from './cleanup.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CleanupController],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class CleanupModule {}
