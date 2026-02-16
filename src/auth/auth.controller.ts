import { Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AuthController {
  @Post('login')
  login() {
    return {
      message: '登录接口',
      data: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', expiresIn: 7200 }
    };
  }

  @Get('login-options')
  getLoginOptions() {
    return {
      message: '获取登录选项接口',
      data: {
        methods: ['password', 'sms', 'oidc'],
        rememberMe: true,
        captchaEnabled: false
      }
    };
  }

  @Post('logout')
  logout() {
    return { message: '登出成功', success: true };
  }
}
