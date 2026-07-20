import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeeStructuresController } from './fee-structures.controller';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeeStructuresController, InvoicesController],
  providers: [FeeStructuresService, InvoicesService],
})
export class FinanceModule {}
