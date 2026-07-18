import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyContext } from '../tenancy/tenancy-context';
import type { OnboardSchoolDto } from './dto/onboard-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(dto: OnboardSchoolDto) {
    const existing = await this.prisma.school.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`School slug "${dto.slug}" is already taken`);
    }

    const school = await this.prisma.school.create({
      data: { name: dto.name, slug: dto.slug, subdomain: dto.slug },
    });

    const passwordHash = await argon2.hash(dto.adminPassword);
    // Read via the raw (unextended) client: this is the one legitimate case for
    // fetching a schoolId=null global role — the tenant-scoping extension would
    // otherwise force schoolId into the where clause and make it unmatchable.
    const schoolAdminRole = await this.prisma.role.findFirstOrThrow({
      where: { schoolId: null, name: 'School Admin' },
    });

    const adminUser = await this.prisma.withTenant(school.slug, async () => {
      const user = await TenancyContext.require().tx.user.create({
        data: { email: dto.adminEmail, passwordHash },
      });

      await TenancyContext.require().tx.userRole.create({
        data: { userId: user.id, roleId: schoolAdminRole.id },
      });

      return user;
    });

    return { school, adminUserId: adminUser.id };
  }
}
