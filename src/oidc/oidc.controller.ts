import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  @Public()
  @Get('login-options')
  async getLoginOptions() {
    return this.oidcService.getLoginOptions();
  }

  @Public()
  @Post('oidc/:provider/auth')
  async getAuthUrl(
    @Param('provider') provider: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('state') state?: string,
  ) {
    const result = await this.oidcService.getAuthUrl(provider, redirectUri, state);
    return {
      auth_url: result.authUrl,
      state: result.state,
    };
  }

  @Public()
  @Post('oidc/:provider/callback')
  async handleCallback(
    @Param('provider') provider: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
  ) {
    return this.oidcService.handleCallback(provider, code, redirectUri);
  }

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

  @Post('oidc/providers')
  async createProvider(
    @Body() providerData: any,
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

  @Post('oidc/providers/:name')
  async updateProvider(
    @Param('name') name: string,
    @Body() providerData: any,
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
