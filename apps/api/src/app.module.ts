import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcademicsModule } from './academics/academics.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CoreModule } from './core/core.module';
import { DocumentsModule } from './documents/documents.module';
import { ExamsModule } from './exams/exams.module';
import { FeesModule } from './fees/fees.module';
import { FilesModule } from './files/files.module';
import { GradesModule } from './grades/grades.module';
import { IamModule } from './iam/iam.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParentsModule } from './parents/parents.module';
import { PrismaModule } from './prisma/prisma.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { TeachersModule } from './teachers/teachers.module';
import { TenantMiddleware } from './tenancy/tenant.middleware';
import { TimetableModule } from './timetable/timetable.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CoreModule,
    IamModule,
    SuperAdminModule,
    AcademicsModule,
    SubjectsModule,
    TeachersModule,
    StudentsModule,
    ParentsModule,
    TimetableModule,
    AttendanceModule,
    GradesModule,
    AssignmentsModule,
    ExamsModule,
    NotificationsModule,
    FilesModule,
    FeesModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
