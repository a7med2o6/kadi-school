import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../core/decorators/public.decorator';
import { OnboardSchoolDto } from './dto/onboard-school.dto';
import { SchoolsService } from './schools.service';
import { SuperAdminGuard } from './super-admin.guard';

@Controller('super-admin/schools')
@Public() // bypasses the global (tenant) JwtAuthGuard; SuperAdminGuard below is this route's real gate
@UseGuards(SuperAdminGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  onboard(@Body() dto: OnboardSchoolDto) {
    return this.schoolsService.onboard(dto);
  }
}
