import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TestSeedController } from './test-seed.controller';

/**
 * Module that exposes test-only seed endpoints when enabled.
 * IMPORTANT: Only import this module when process.env.E2E_TEST_MODE === 'true'.
 */
@Module({
  imports: [PrismaModule],
  controllers: [TestSeedController],
})
export class TestSeedModule {}
