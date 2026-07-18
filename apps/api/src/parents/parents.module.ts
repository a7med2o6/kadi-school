import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';

@Module({
  imports: [PrismaModule],
  controllers: [ParentsController, GuardiansController],
  providers: [ParentsService, GuardiansService],
})
export class ParentsModule {}
