import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { SuperAdminTokenPayload } from './super-admin-payload';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { email } });

    if (!superAdmin || !(await argon2.verify(superAdmin.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: SuperAdminTokenPayload = { sub: superAdmin.id, realm: 'super-admin' };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.SUPER_ADMIN_JWT_SECRET,
      expiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN ?? '8h',
    });

    return { accessToken };
  }
}
