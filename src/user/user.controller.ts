import { Controller, Get } from '@nestjs/common';

@Controller()
export class UserController {
  @Get('currentUser')
  getCurrentUser() {
    return {
      message: '获取当前用户信息接口',
      data: {
        userId: '10001',
        username: 'current_user',
        nickname: '当前登录用户',
        role: 'user',
        status: 'active'
      }
    };
  }
}
