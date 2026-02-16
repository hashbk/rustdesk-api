import { Controller, Get } from '@nestjs/common';

@Controller()
export class UserController {
  @Get('currentUser')
  getCurrentUser() {
    return {
      message: '获取当前用户信息接口',
      data: { userId: '1001', username: 'admin', nickname: '系统管理员', role: 'admin' }
    };
  }

  @Get('users')
  getUsers() {
    return {
      message: '获取用户列表接口',
      data: [
        { userId: '1001', username: 'admin', nickname: '系统管理员' },
        { userId: '1002', username: 'test', nickname: '测试用户' }
      ]
    };
  }
}
