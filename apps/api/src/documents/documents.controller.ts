import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { localDiskStorage } from '../files/local-storage';
import { DocumentsService } from './documents.service';
import { CreateStudentDocumentDto, ListStudentDocumentsQueryDto } from './dto/document.dto';

const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @RequirePermission('documents:read')
  list(@Query() query: ListStudentDocumentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  @Post()
  @RequirePermission('documents:write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: localDiskStorage('documents'),
      limits: { fileSize: DOCUMENT_MAX_BYTES },
    }),
  )
  create(
    @Body() dto: CreateStudentDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.create(dto, file, user.id);
  }

  @Get(':id/download')
  @RequirePermission('documents:read')
  async download(@Param('id') id: string, @Res() res: Response, @CurrentUser() user: AuthenticatedUser) {
    const doc = await this.service.get(id, user);
    res.download(doc.filePath, doc.fileName);
  }

  @Delete(':id')
  @RequirePermission('documents:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
