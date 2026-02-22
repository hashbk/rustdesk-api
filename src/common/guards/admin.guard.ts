import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * 管理员权限守卫
 * 用于保护需要管理员权限的接口
 * 
 * 使用方式：
 * @UseGuards(AdminGuard)
 * @Get('admin-only')
 * async adminOnlyEndpoint() { ... }
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('请先登录');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('无权限访问，需要管理员权限');
    }

    return true;
  }
}
