import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyCheckController } from './tenancy-check.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TenancyCheckController],
})
export class TenancyModule {}
