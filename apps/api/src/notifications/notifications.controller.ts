import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/types/authenticated-user';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermission('notifications:write')
  list() {
    return this.service.list();
  }

  @Get('inbox')
  @RequirePermission('notifications:read')
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.service.inbox(user.id);
  }

  @Get('unread-count')
  @RequirePermission('notifications:read')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.service.unreadCount(user.id);
    return { count };
  }

  @Post()
  @RequirePermission('notifications:write')
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch('read-all')
  @RequirePermission('notifications:read')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.service.markAllRead(user.id);
  }

  @Patch(':id/read')
  @RequirePermission('notifications:read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markRead(id, user.id);
  }
}
