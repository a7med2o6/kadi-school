import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [AuthController, UsersController, RolesController],
  providers: [AuthService],
})
export class IamModule {}
