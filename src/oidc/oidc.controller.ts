import { Controller, Get, Post } from '@nestjs/common';

@Controller('oidc')
export class OidcController {
  @Post('auth')
  oidcAuth() {
    return {
      message: 'OidcAuth接口',
      data: { authUrl: 'https://oidc.example.com/authorize', clientId: 'oidc_client_123' }
    };
  }

  @Get('auth-query')
  oidcAuthQuery() {
    return {
      message: 'OidcAuthQuery接口',
      data: { redirectUri: 'http://localhost:3000/oidc/callback', scope: 'openid email profile' }
    };
  }
}
