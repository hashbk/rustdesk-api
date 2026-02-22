import { Controller, Get, Post, Body, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { OidcAuthRequestDto, OidcCancelDto, OidcProviderDto } from './dto/oidc.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  /**
   * 获取登录选项
   * GET /api/login-options
   */
  @Public()
  @Get('login-options')
  async getLoginOptions() {
    return this.oidcService.getLoginOptions();
  }

  /**
   * 请求 OIDC 授权
   * POST /api/oidc/auth
   */
  @Public()
  @Post('oidc/auth')
  async requestAuth(@Body() authRequest: OidcAuthRequestDto) {
    return this.oidcService.requestAuth(authRequest);
  }

  /**
   * 查询 OIDC 授权状态
   * GET /api/oidc/auth-query?code=xxx&id=xxx&uuid=xxx
   */
  @Public()
  @Get('oidc/auth-query')
  async queryAuth(
    @Query('code') code: string,
    @Query('id') deviceId: string,
    @Query('uuid') deviceUuid: string,
  ) {
    return this.oidcService.queryAuth(code, deviceId, deviceUuid);
  }

  /**
   * OIDC 回调接口
   * GET /api/oidc/callback?code=xxx&state=xxx
   */
  @Public()
  @Get('oidc/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    try {
      const html = await this.oidcService.handleCallback(code, state);
      res.status(HttpStatus.OK).send(html);
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).send(`
        <!DOCTYPE html>
        <html>
        <head><title>授权失败</title></head>
        <body>
          <h1>授权失败</h1>
          <p>${error.message}</p>
        </body>
        </html>
      `);
    }
  }

  /**
   * 取消授权
   * POST /api/oidc/cancel
   */
  @Public()
  @Post('oidc/cancel')
  async cancelAuth(@Body() cancelDto: OidcCancelDto) {
    await this.oidcService.cancelAuth(cancelDto.code);
    return { message: '已取消授权' };
  }

  // ============ 管理员接口 ============

  /**
   * 获取所有 OIDC 提供商
   * GET /api/oidc/providers
   */
  @Get('oidc/providers')
  async getAllProviders(
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

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
  async createProvider(
    @Body() providerData: OidcProviderDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

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
  async updateProvider(
    @Param('name') name: string,
    @Body() providerData: OidcProviderDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

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
  async deleteProvider(
    @Param('name') name: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.oidcService.deleteProvider(name);
    return { message: '删除成功' };
  }
}
