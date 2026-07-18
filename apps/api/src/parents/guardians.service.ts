import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LinkGuardianDto } from './dto/guardian-link.dto';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  link(dto: LinkGuardianDto) {
    return this.prisma.client.studentGuardian.create({
      data: {
        studentId: dto.studentId,
        parentId: dto.parentId,
        relationship: dto.relationship,
        isPrimaryContact: dto.isPrimaryContact ?? false,
      },
      include: { student: true, parent: true },
    });
  }

  async unlink(id: string) {
    const link = await this.prisma.client.studentGuardian.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Guardian link not found');
    await this.prisma.client.studentGuardian.delete({ where: { id } });
  }
}
