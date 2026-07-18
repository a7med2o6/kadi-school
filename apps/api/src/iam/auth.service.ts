import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyContext } from '../tenancy/tenancy-context';
import { parseDurationMs } from './duration';
import type { AccessTokenPayload } from './jwt-payload';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(identifier: string, password: string): Promise<{ tokens: IssuedTokens; userId: string }> {
    const tenant = TenancyContext.require();

    const user = await this.prisma.client.user.findFirst({
      where: { OR: [{ email: identifier }, { civilId: identifier }] },
    });

    // Same error for "no such user" and "wrong password" — don't leak which one it was.
    if (!user || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenFamily(user.id, tenant.schoolId, tenant.schoolSlug, randomUUID());

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { tokens, userId: user.id };
  }

  async refresh(rawRefreshToken: string): Promise<IssuedTokens> {
    const tenant = TenancyContext.require();
    const tokenHash = this.hashToken(rawRefreshToken);

    const existing = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      // A revoked token was presented again — someone is replaying a stolen token.
      // Burn the whole session chain, not just this one token.
      await this.prisma.client.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new ForbiddenException('Refresh token reuse detected — session revoked');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.client.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenFamily(existing.userId, tenant.schoolId, tenant.schoolSlug, existing.familyId);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing || existing.revokedAt) {
      return;
    }
    await this.prisma.client.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenFamily(
    userId: string,
    schoolId: string,
    schoolSlug: string,
    familyId: string,
  ): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = { sub: userId, schoolId, schoolSlug };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });

    const rawRefreshToken = randomBytes(48).toString('base64url');
    const refreshTokenExpiresAt = new Date(
      Date.now() + parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'),
    );

    await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawRefreshToken),
        familyId,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, refreshTokenExpiresAt };
  }

  private hashToken(rawToken: string): string {
    // sha256 is fine here — the token is a 48-byte random secret, not a low-entropy
    // password, so there's no offline brute-force risk that argon2 would defend against.
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
