import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { ParentsService } from './parents.service';
import { CreateParentDto, UpdateParentDto } from './dto/parent.dto';

@Controller('parents')
export class ParentsController {
  constructor(private readonly service: ParentsService) {}

  @Get()
  @RequirePermission('parents:read')
  list() {
    return this.service.list();
  }

  @Get('me/children')
  getOwnChildren(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listChildrenForUser(user.id);
  }

  @Get(':id')
  @RequirePermission('parents:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('parents:write')
  create(@Body() dto: CreateParentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('parents:write')
  update(@Param('id') id: string, @Body() dto: UpdateParentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('parents:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
