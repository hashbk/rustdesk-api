import { Controller, Get, Post, Body, Param, Query, Res, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { OidcAuthRequestDto, OidcCancelDto, OidcProviderDto } from './dto/oidc.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards';

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
  @Get('oidc/auth-query')
  async queryAuth(
    @Query('code') code: string,
    @Query('id') deviceId: string,
    @Query('uuid') deviceUuid: string,
  ) {
    throw new BadRequestException('OIDC 功能正在开发中，暂时不可用');
  }

  /**
   * OIDC 回调接口
   * GET /api/oidc/callback?code=xxx&state=xxx
   * 注意：暂时禁用
   */
  @Public()
  @Get('oidc/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).send(`
      <!DOCTYPE html>
      <html>
      <head><title>功能暂不可用</title></head>
      <body>
        <h1>功能暂不可用</h1>
        <p>OIDC 功能正在开发中，暂时不可用</p>
      </body>
      </html>
    `);
  }

  /**
   * 取消授权
   * POST /api/oidc/cancel
   * 注意：暂时禁用
   */
  @Public()
  @Post('oidc/cancel')
  async cancelAuth(@Body() cancelDto: OidcCancelDto) {
    throw new BadRequestException('OIDC 功能正在开发中，暂时不可用');
  }

  // ============ 管理员接口 ============
  // 注意：管理员接口暂时保留，用于配置 OIDC 提供商

  /**
   * 获取所有 OIDC 提供商
   * GET /api/oidc/providers
   */
  @Get('oidc/providers')
  @UseGuards(AdminGuard)
  async getAllProviders() {
    const providers = await this.oidcService.getAllProviders();
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      issuer: p.issuer,
      client_id: p.clientId,
      scope: p.scope,
      enabled: p.enabled,
      priority: p.priority,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));
  }

  /**
   * 创建 OIDC 提供商
   * POST /api/oidc/providers
   */
  @Post('oidc/providers')
  @UseGuards(AdminGuard)
  async createProvider(@Body() providerData: OidcProviderDto) {
    const provider = await this.oidcService.upsertProvider(providerData);
    return {
      id: provider.id,
      name: provider.name,
      issuer: provider.issuer,
      enabled: provider.enabled,
    };
  }

  /**
   * 更新 OIDC 提供商
   * POST /api/oidc/providers/:name
   */
  @Post('oidc/providers/:name')
  @UseGuards(AdminGuard)
  async updateProvider(
    @Param('name') name: string,
    @Body() providerData: OidcProviderDto,
  ) {
    const provider = await this.oidcService.upsertProvider({
      ...providerData,
      name,
    });

    return {
      id: provider.id,
      name: provider.name,
      issuer: provider.issuer,
      enabled: provider.enabled,
    };
  }

  /**
   * 删除 OIDC 提供商
   * POST /api/oidc/providers/:name/delete
   */
  @Post('oidc/providers/:name/delete')
  @UseGuards(AdminGuard)
  async deleteProvider(@Param('name') name: string) {
    await this.oidcService.deleteProvider(name);
    return { message: '删除成功' };
  }
}
