import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { localDiskStorage } from '../files/local-storage';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  @RequirePermission('students:read')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('students:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('students:write')
  create(@Body() dto: CreateStudentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('students:write')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('students:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/avatar')
  @RequirePermission('students:write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: localDiskStorage('avatars'),
      limits: { fileSize: AVATAR_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        cb(file.mimetype.startsWith('image/') ? null : new BadRequestException('File must be an image'), true);
      },
    }),
  )
  uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.updateAvatar(id, `/api/v1/uploads/avatars/${file.filename}`);
  }
}
