import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminGuard } from './super-admin.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [SuperAdminAuthController, SchoolsController],
  providers: [SuperAdminAuthService, SchoolsService, SuperAdminGuard],
})
export class SuperAdminModule {}
