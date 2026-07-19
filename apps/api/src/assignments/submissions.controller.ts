import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequirePermission } from '../core/decorators/require-permission.decorator';
import { SubmissionsService } from './submissions.service';
import { BulkUpsertSubmissionsDto } from './dto/submission.dto';

@Controller('assignments/:assignmentId/submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Get()
  @RequirePermission('homework:read')
  list(@Param('assignmentId') assignmentId: string) {
    return this.service.list(assignmentId);
  }

  @Post('bulk')
  @RequirePermission('homework:write')
  bulkUpsert(@Param('assignmentId') assignmentId: string, @Body() dto: BulkUpsertSubmissionsDto) {
    return this.service.bulkUpsert(assignmentId, dto);
  }
}
