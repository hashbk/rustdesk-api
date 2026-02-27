import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { OidcProvider } from './entities/oidc-provider.entity';
import { OidcAuthState, OidcAuthStatus } from './entities/oidc-auth-state.entity';
import { User, UserInfo } from '../user/entities/user.entity';
import { UserToken } from '../user/entities/user-token.entity';
import { OidcAuthRequestDto } from './dto/oidc.dto';
import * as bcrypt from 'bcryptjs';

export interface OidcConfig {
  name: string;
  issuer: string;
  client_id: string;
  redirect_uri?: string;
  scope?: string;
}

export interface OidcAuthUrlResponse {
  code: string;
  url: string;
}

export interface AuthBody {
  access_token: string;
  type: string;
  tfa_type?: string;
  secret?: string;
  user: {
    name: string;
    email?: string;
    note?: string;
    status: number;
    info?: UserInfo;
    is_admin: boolean;
    third_auth_type?: string;
  };
}

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private readonly AUTH_CODE_EXPIRY_MINUTES = 3; // 授权码有效期 3 分钟
  private readonly TOKEN_EXPIRY_DAYS = 30; // Token 有效期 30 天

  constructor(
    @InjectRepository(OidcProvider)
    private providerRepository: Repository<OidcProvider>,
    @InjectRepository(OidcAuthState)
    private authStateRepository: Repository<OidcAuthState>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private userTokenRepository: Repository<UserToken>,
    private jwtService: JwtService,
  ) {}

  /**
   * 获取所有启用的 OIDC 提供商
   */
  async getLoginOptions(): Promise<string[]> {
    const providers = await this.providerRepository.find({
      where: { enabled: true },
      order: { priority: 'ASC' },
    });

    const options: string[] = [];

    for (const provider of providers) {
      const config: OidcConfig = {
        name: provider.name,
        issuer: provider.issuer,
        client_id: provider.clientId,
        scope: provider.scope || 'openid email profile',
      };

      // 使用 common-oidc 格式返回配置
      options.push(`common-oidc/${JSON.stringify(config)}`);
    }

    return options;
  }

  /**
   * 请求 OIDC 授权
   * POST /api/oidc/auth
   */
  async requestAuth(authRequest: OidcAuthRequestDto): Promise<OidcAuthUrlResponse> {
    const { op, id, uuid, deviceInfo } = authRequest;

    // 解析 OIDC 提供商标识
    const providerName = op.replace('oidc/', '');

    const provider = await this.providerRepository.findOne({
      where: { name: providerName, enabled: true },
    });

    if (!provider) {
      throw new BadRequestException(`OIDC 提供商 "${providerName}" 不存在或未启用`);
    }

    // 生成授权码
    const code = uuidv4();

    // 生成 OIDC state 参数
    const state = uuidv4();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.AUTH_CODE_EXPIRY_MINUTES);

    // 构建回调 URL
    const redirectUri = `${process.env.OIDC_REDIRECT_URI || 'http://localhost:3000'}/api/oidc/callback`;

    // 保存授权状态
    const authState = this.authStateRepository.create({
      guid: uuidv4(),
      code,
      op,
      deviceId: id,
      deviceUuid: uuid,
      deviceInfo: JSON.stringify(deviceInfo),
      redirectUri,
      state,
      status: OidcAuthStatus.PENDING,
      expiresAt,
    });

    await this.authStateRepository.save(authState);

    // 构建授权 URL
    const authEndpoint = provider.authorizationEndpoint || `${provider.issuer}/authorize`;
    const scope = provider.scope || 'openid email profile';

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
    });

    const url = `${authEndpoint}?${params.toString()}`;

    this.logger.log(`OIDC auth requested: code=${code}, op=${op}`);

    return { code, url };
  }

  /**
   * 查询 OIDC 授权状态
   * GET /api/oidc/auth-query?code=xxx&id=xxx&uuid=xxx
   */
  async queryAuth(code: string, deviceId: string, deviceUuid: string): Promise<AuthBody> {
    // 查找授权状态
    const authState = await this.authStateRepository.findOne({
      where: {
        code,
        deviceId,
        deviceUuid,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!authState) {
      throw new UnauthorizedException('No authed oidc is found');
    }

    // 检查授权状态
    if (authState.status === OidcAuthStatus.PENDING) {
      throw new UnauthorizedException('No authed oidc is found');
    }

    if (authState.status === OidcAuthStatus.EXPIRED) {
      throw new UnauthorizedException('Authorization expired');
    }

    if (authState.status === OidcAuthStatus.CANCELLED) {
      throw new UnauthorizedException('Authorization cancelled');
    }

    // 授权成功，返回 token
    if (authState.status === OidcAuthStatus.AUTHORIZED && authState.accessToken) {
      // 获取用户信息
      const user = await this.userRepository.findOne({
        where: { guid: authState.userGuid },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 清理授权状态
      await this.authStateRepository.remove(authState);

      return {
        access_token: authState.accessToken,
        type: 'access_token',
        user: {
          name: user.username,
          email: user.email || undefined,
          note: user.note || undefined,
          status: user.status,
          info: user.getUserInfo(),
          is_admin: user.isAdmin,
          third_auth_type: user.thirdAuthType || undefined,
        },
      };
    }

    throw new UnauthorizedException('No authed oidc is found');
  }

  /**
   * 模拟 OIDC code 交换（实际项目中需要实现）
   */
  private async exchangeCodeForUserInfo(
    provider: OidcProvider,
    code: string,
    redirectUri: string,
  ): Promise<{ email: string; username?: string; access_token: string }> {
    // TODO: 实现实际的 OIDC 流程
    // 1. POST to token endpoint with code
    // 2. GET userinfo endpoint with access_token

    // 这里返回模拟数据用于测试
    // 实际项目中需要根据 provider 配置调用相应的 API
    this.logger.warn('OIDC code exchange not implemented, using mock data');

    return {
      email: `oidc_user_${Date.now()}@example.com`,
      username: `oidc_user_${Date.now()}`,
      access_token: 'mock_oidc_access_token',
    };
  }

  /**
   * 为用户生成 JWT token 并保存到数据库
   */
  private async generateTokenForUser(user: User, deviceId?: string, deviceUuid?: string): Promise<string> {
    const payload = {
      sub: user.guid,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      deviceId,
    };

    const token = this.jwtService.sign(payload);

    // 保存 Token 到数据库
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.TOKEN_EXPIRY_DAYS);

    const userToken = this.userTokenRepository.create({
      guid: uuidv4(),
      userGuid: user.guid,
      token,
      deviceId,
      deviceUuid,
      expiresAt,
    });

    await this.userTokenRepository.save(userToken);

    return token;
  }
}
