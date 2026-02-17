import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OidcProvider } from './entities/oidc-provider.entity';
import { OidcAuthState, OidcAuthStatus } from './entities/oidc-auth-state.entity';
import { User, UserInfo } from '../user/entities/user.entity';
import { OidcAuthRequestDto } from './dto/oidc.dto';
import { AuthService } from '../auth/auth.service';
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

  constructor(
    @InjectRepository(OidcProvider)
    private providerRepository: Repository<OidcProvider>,
    @InjectRepository(OidcAuthState)
    private authStateRepository: Repository<OidcAuthState>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService,
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
        where: { id: authState.userId },
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
   * 处理 OIDC 回调（由 OIDC 提供商调用）
   * GET /api/oidc/callback?code=xxx&state=xxx
   */
  async handleCallback(code: string, state: string): Promise<string> {
    // 查找授权状态
    const authState = await this.authStateRepository.findOne({
      where: { state },
    });

    if (!authState) {
      throw new BadRequestException('Invalid state parameter');
    }

    // 检查是否过期
    if (authState.expiresAt < new Date()) {
      authState.status = OidcAuthStatus.EXPIRED;
      await this.authStateRepository.save(authState);
      throw new BadRequestException('Authorization expired');
    }

    // 解析 OIDC 提供商
    const providerName = authState.op.replace('oidc/', '');
    const provider = await this.providerRepository.findOne({
      where: { name: providerName },
    });

    if (!provider) {
      throw new BadRequestException('OIDC provider not found');
    }

    // TODO: 实现实际的 OIDC Token 交换和用户信息获取
    // 1. 使用 code 换取 access_token
    // 2. 使用 access_token 获取用户信息
    // 3. 根据用户信息创建或查找本地用户
    // 4. 生成本地 JWT token

    // 这里是模拟实现
    const userInfo = await this.exchangeCodeForUserInfo(provider, code, authState.redirectUri);

    // 查找或创建用户
    let user = await this.userRepository.findOne({
      where: { email: userInfo.email },
    });

    if (!user) {
      // 自动创建用户
      user = this.userRepository.create({
        username: userInfo.username || userInfo.email.split('@')[0],
        email: userInfo.email,
        password: await bcrypt.hash(uuidv4(), 10),
        status: 1, // UserStatus.ACTIVE
        isAdmin: false,
        thirdAuthType: 'oidc',
      });
      await this.userRepository.save(user);
    } else if (!user.thirdAuthType) {
      // 更新第三方认证类型
      user.thirdAuthType = 'oidc';
      await this.userRepository.save(user);
    }

    // 生成 JWT token
    const token = await this.generateTokenForUser(user, authState.deviceId, authState.deviceUuid);

    // 更新授权状态
    authState.status = OidcAuthStatus.AUTHORIZED;
    authState.userId = user.id;
    authState.accessToken = token;
    authState.oidcAccessToken = userInfo.access_token;
    await this.authStateRepository.save(authState);

    this.logger.log(`OIDC auth completed: userId=${user.id}, code=${authState.code}`);

    // 返回成功页面 HTML
    return `
      <!DOCTYPE html>
      <html>
      <head><title>授权成功</title></head>
      <body>
        <h1>授权成功</h1>
        <p>您可以关闭此页面并返回 RustDesk 客户端。</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body>
      </html>
    `;
  }

  /**
   * 取消授权
   */
  async cancelAuth(code: string): Promise<void> {
    const authState = await this.authStateRepository.findOne({
      where: { code },
    });

    if (authState) {
      authState.status = OidcAuthStatus.CANCELLED;
      await this.authStateRepository.save(authState);
    }
  }

  /**
   * 清理过期的授权状态
   */
  async cleanupExpiredStates(): Promise<number> {
    const result = await this.authStateRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  /**
   * 获取 OIDC 提供商配置
   */
  async getProviderConfig(providerName: string): Promise<OidcProvider | null> {
    return this.providerRepository.findOne({
      where: { name: providerName, enabled: true },
    });
  }

  /**
   * 创建或更新 OIDC 提供商
   */
  async upsertProvider(providerData: Partial<OidcProvider>): Promise<OidcProvider> {
    let provider = await this.providerRepository.findOne({
      where: { name: providerData.name },
    });

    if (provider) {
      Object.assign(provider, providerData);
    } else {
      provider = this.providerRepository.create(providerData);
    }

    return this.providerRepository.save(provider);
  }

  /**
   * 删除 OIDC 提供商
   */
  async deleteProvider(providerName: string): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { name: providerName },
    });

    if (provider) {
      await this.providerRepository.remove(provider);
    }
  }

  /**
   * 获取所有 OIDC 提供商（管理员）
   */
  async getAllProviders(): Promise<OidcProvider[]> {
    return this.providerRepository.find({
      order: { priority: 'ASC' },
    });
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
   * 为用户生成 JWT token
   */
  private async generateTokenForUser(user: User, deviceId?: string, deviceUuid?: string): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      deviceId,
    };

    // 使用 AuthService 的方法生成 token
    // 这里简化处理，实际应该调用 AuthService
    const { JwtService } = require('@nestjs/jwt');
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'rustdesk-api-secret-key-change-in-production',
      signOptions: { expiresIn: '30d' },
    });

    return jwtService.sign(payload);
  }
}
