import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OidcService } from './oidc.service';
import { OidcAuthRequestDto } from './dto/oidc.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * OIDC 控制器
 *
 * 注意：OIDC 功能正在开发中，暂时关闭所有相关接口
 */

@Controller()
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  /**
   * 获取登录选项
   * GET /api/login-options
   * 注意：暂时只返回空列表，OIDC 选项已禁用
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('login-options')
  async getLoginOptions() {
    // OIDC 功能正在开发中，暂时返回空列表
    return [];
  }

  /**
   * 请求 OIDC 授权
   * POST /api/oidc/auth
   * 注意：暂时禁用
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('oidc/auth')
  async requestAuth(@Body() authRequest: OidcAuthRequestDto) {
    throw new BadRequestException('OIDC 功能正在开发中，暂时不可用');
  }

  /**
   * 查询 OIDC 授权状态
   * GET /api/oidc/auth-query?code=xxx&id=xxx&uuid=xxx
   * 注意：暂时禁用
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('oidc/auth-query')
  async queryAuth(
    @Query('code') code: string,
    @Query('id') deviceId: string,
    @Query('uuid') deviceUuid: string,
  ) {
    throw new BadRequestException('OIDC 功能正在开发中，暂时不可用');
  }
}
