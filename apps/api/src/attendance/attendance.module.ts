import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentAttendanceService } from './student-attendance.service';
import { TeacherAttendanceController } from './teacher-attendance.controller';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { AttendanceNotesController } from './attendance-notes.controller';
import { AttendanceNotesService } from './attendance-notes.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    StudentAttendanceController,
    TeacherAttendanceController,
    LeaveRequestsController,
    AttendanceNotesController,
  ],
  providers: [StudentAttendanceService, TeacherAttendanceService, LeaveRequestsService, AttendanceNotesService],
})
export class AttendanceModule {}
