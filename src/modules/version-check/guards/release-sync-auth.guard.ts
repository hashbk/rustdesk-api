import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * Release 同步认证 Guard
 * 使用 Bearer Token 进行认证
 */
@Injectable()
export class ReleaseSyncAuthGuard implements CanActivate {
  private readonly logger = new Logger(ReleaseSyncAuthGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    this.logger.debug(`检查 Release 同步认证: has_auth_header=${!!authHeader}`);

    if (!authHeader) {
      this.logger.warn('拒绝访问：缺少 Authorization 头');
      throw new UnauthorizedException('Missing Authorization header');
    }

    // 检查是否为 Bearer Token 格式
    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(`拒绝访问：无效的认证格式，期望 "Bearer <token>"，实际为 "${authHeader.substring(0, 20)}..."`);
      throw new UnauthorizedException('Invalid authorization format. Expected "Bearer <token>"');
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    if (!token || token.trim() === '') {
      this.logger.warn('拒绝访问：空的 Token');
      throw new UnauthorizedException('Empty token');
    }

    // 验证 Token（这里使用环境变量中的配置）
    const validToken = process.env.RELEASE_SYNC_TOKEN;

    if (!validToken) {
      this.logger.error('配置错误：未设置 RELEASE_SYNC_TOKEN 环境变量');
      throw new UnauthorizedException('Server configuration error: RELEASE_SYNC_TOKEN not set');
    }

    if (token !== validToken) {
      this.logger.warn(`拒绝访问：无效的 Token，期望长度=${validToken.length}，实际长度=${token.length}`);
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.debug('认证成功');
    return true;
  }
}
