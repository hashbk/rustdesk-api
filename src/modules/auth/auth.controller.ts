import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, CurrentUserDto, LogoutDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request } from 'express';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('guid') userGuid: string,
    @Body() logoutDto: LogoutDto,
    @Req() req: Request,
  ) {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    await this.authService.logout(userGuid, logoutDto, token);
    return { message: '登出成功' };
  }

  @Post('currentUser')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(
    @CurrentUser('guid') userGuid: string,
    @Body() currentUserDto: CurrentUserDto,
  ) {
    return this.authService.getCurrentUser(userGuid, currentUserDto);
  }
}
