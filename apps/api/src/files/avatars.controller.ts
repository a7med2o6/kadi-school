import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Public } from '../core/decorators/public.decorator';
import { UPLOADS_ROOT, isSafeStoredFilename } from './local-storage';

@Controller('uploads/avatars')
export class AvatarsController {
  @Get(':filename')
  @Public()
  serve(@Param('filename') filename: string, @Res() res: Response) {
    if (!isSafeStoredFilename(filename)) {
      throw new NotFoundException('File not found');
    }
    const path = join(UPLOADS_ROOT, 'avatars', filename);
    if (!existsSync(path)) {
      throw new NotFoundException('File not found');
    }
    res.sendFile(path);
  }
}
