import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Param, Query } from '@nestjs/common';
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
    @CurrentUser('id') userId: number,
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
    @CurrentUser('id') userId: number,
    @Body() currentUserDto: CurrentUserDto,
  ) {
    return this.authService.getCurrentUser(userId, currentUserDto);
  }

  @Public()
  @Get('login-options')
  async getLoginOptions() {
    // 返回支持的登录方式
    return [
      'oidc/google',
      'oidc/github',
    ];
  }

  // ==================== TFA 测试辅助接口 ====================

  /**
   * 为用户生成 TFA Secret
   * GET /api/tfa/setup/:userId
   */
  @Public()
  @Get('tfa/setup/:userId')
  async setupTfa(@Param('userId') userId: string) {
    return this.authService.generateTfaSecret(parseInt(userId, 10));
  }

  /**
   * 验证 TFA 验证码
   * GET /api/tfa/verify?secret=xxx&code=123456
   */
  @Public()
  @Get('tfa/verify')
  async verifyTfa(@Query('secret') secret: string, @Query('code') code: string) {
    return this.authService.testTfaCode(secret, code);
  }

  /**
   * 禁用用户的 TFA
   * GET /api/tfa/disable/:userId
   */
  @Public()
  @Get('tfa/disable/:userId')
  async disableTfa(@Param('userId') userId: string) {
    return this.authService.disableTfa(parseInt(userId, 10));
  }
}
