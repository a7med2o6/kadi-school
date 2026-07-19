import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { SAFE_USER_FIELDS } from '../prisma/safe-user-select';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { assertCanAccessStudent } from '../students/student-access.util';
import type { CreateStudentDocumentDto, ListStudentDocumentsQueryDto } from './dto/document.dto';

// filePath is a server-local disk path — internal only, never returned to clients.
const SELECT = {
  id: true,
  studentId: true,
  title: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
  uploadedByUser: { select: SAFE_USER_FIELDS },
} as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListStudentDocumentsQueryDto, user: AuthenticatedUser) {
    if (query.studentId) {
      await assertCanAccessStudent(this.prisma, user, query.studentId);
    }
    return this.prisma.client.studentDocument.findMany({
      where: { studentId: query.studentId },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    dto: CreateStudentDocumentDto,
    file: { originalname: string; path: string; mimetype: string; size: number },
    uploadedByUserId: string,
  ) {
    return this.prisma.client.studentDocument.create({
      data: {
        studentId: dto.studentId,
        title: dto.title,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedByUserId,
      },
      select: SELECT,
    });
  }

  async get(id: string, user: AuthenticatedUser) {
    const doc = await this.prisma.client.studentDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await assertCanAccessStudent(this.prisma, user, doc.studentId);
    return doc;
  }

  async remove(id: string) {
    const doc = await this.prisma.client.studentDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.client.studentDocument.delete({ where: { id } });
    await unlink(doc.filePath).catch(() => undefined);
  }
}
