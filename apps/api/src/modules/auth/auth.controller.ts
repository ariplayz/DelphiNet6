import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  schoolId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto.email, dto.password, res, dto.schoolId);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.['sesh'], res);
  }

  @Get('me')
  me(@Req() req: Request) {
    const { permissions, passwordHash: _ph, ...user } = req.user as any;
    return { ...user, permissions };
  }

  @Post('renew')
  @HttpCode(200)
  async renew(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined = req.cookies?.['sesh'];
    if (!token) {
      return { message: 'No session' };
    }
    return this.authService.renew(token, res);
  }
}
