import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PayrollStructuresController } from './payroll-structures.controller';
import { PayrollStructuresService } from './payroll-structures.service';
import { PayslipsController } from './payslips.controller';
import { PayslipsService } from './payslips.service';

@Module({
  imports: [PrismaModule],
  controllers: [PayrollStructuresController, PayslipsController],
  providers: [PayrollStructuresService, PayslipsService],
})
export class PayrollModule {}
