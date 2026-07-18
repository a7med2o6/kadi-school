import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { Public } from '../core/decorators/public.decorator';
import { SuperAdminAuthService } from './super-admin-auth.service';

class SuperAdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(private readonly authService: SuperAdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: SuperAdminLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
