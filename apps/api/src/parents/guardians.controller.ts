import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { GuardiansService } from './guardians.service';
import { LinkGuardianDto } from './dto/guardian-link.dto';

@Controller('student-guardians')
export class GuardiansController {
  constructor(private readonly service: GuardiansService) {}

  @Post()
  @RequirePermission('parents:write')
  link(@Body() dto: LinkGuardianDto) {
    return this.service.link(dto);
  }

  @Delete(':id')
  @RequirePermission('parents:write')
  unlink(@Param('id') id: string) {
    return this.service.unlink(id);
  }
}
