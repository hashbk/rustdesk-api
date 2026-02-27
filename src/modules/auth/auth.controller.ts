import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './services';
import { LoginDto, CurrentUserDto, LogoutDto } from './dto/auth.dto';
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,  // 保持原有字段名 id
    @Body() logoutDto: LogoutDto,
    @Req() req: Request,
  ) {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    await this.authService.logout(userId, logoutDto, token);
    return { message: '登出成功' };
  }

  @Post('currentUser')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(
    @CurrentUser('id') userId: string,  // 保持原有字段名 id
    @Body() currentUserDto: CurrentUserDto,
  ) {
    return this.authService.getCurrentUser(userId, currentUserDto);
  }
}
