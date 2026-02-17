import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OidcProvider } from './entities/oidc-provider.entity';
import { AuthService } from '../auth/auth.service';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface OidcConfig {
  name: string;
  issuer: string;
  client_id: string;
  redirect_uri?: string;
  scope?: string;
}

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);

  constructor(
    @InjectRepository(OidcProvider)
    private providerRepository: Repository<OidcProvider>,
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
   * 获取 OIDC 授权 URL
   */
  async getAuthUrl(providerName: string, redirectUri: string, state?: string): Promise<{ authUrl: string; state: string }> {
    const provider = await this.providerRepository.findOne({
      where: { name: providerName, enabled: true },
    });

    if (!provider) {
      throw new BadRequestException(`OIDC 提供商 "${providerName}" 不存在或未启用`);
    }

    // 生成 state 参数用于防止 CSRF 攻击
    const stateParam = state || uuidv4();

    // 构建授权 URL
    const authEndpoint = provider.authorizationEndpoint || `${provider.issuer}/authorize`;
    const scope = provider.scope || 'openid email profile';

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state: stateParam,
    });

    const authUrl = `${authEndpoint}?${params.toString()}`;

    return { authUrl, state: stateParam };
  }

  /**
   * 处理 OIDC 回调
   */
  async handleCallback(
    providerName: string,
    code: string,
    redirectUri: string,
  ): Promise<{ access_token: string; type: string; user: any }> {
    const provider = await this.providerRepository.findOne({
      where: { name: providerName, enabled: true },
    });

    if (!provider) {
      throw new BadRequestException(`OIDC 提供商 "${providerName}" 不存在或未启用`);
    }

    // TODO: 实现 OIDC Token 交换和用户信息获取
    // 1. 使用 code 换取 access_token
    // 2. 使用 access_token 获取用户信息
    // 3. 根据用户信息创建或查找本地用户
    // 4. 生成本地 JWT token

    // 这里是一个简化的实现示例
    // 实际项目中需要使用 oidc-client 或类似库

    // 模拟获取用户信息
    const userInfo = await this.fetchUserInfo(provider, code, redirectUri);

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
      });
      await this.userRepository.save(user);
    }

    // 生成 JWT token
    const token = await this.generateTokenForUser(user);

    return {
      access_token: token,
      type: 'access_token',
      user: {
        name: user.username,
        email: user.email,
        note: user.note || '',
        status: user.status,
        is_admin: user.isAdmin,
      },
    };
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
   * 模拟获取用户信息（实际项目中需要实现 OIDC 流程）
   */
  private async fetchUserInfo(
    provider: OidcProvider,
    code: string,
    redirectUri: string,
  ): Promise<{ email: string; username?: string }> {
    // TODO: 实现实际的 OIDC 流程
    // 1. POST to token endpoint with code
    // 2. GET userinfo endpoint with access_token

    // 这里返回模拟数据
    // 实际项目中需要根据 provider 配置调用相应的 API
    throw new BadRequestException('OIDC 流程尚未完全实现，请配置完整的 OIDC 提供商信息');
  }

  /**
   * 为用户生成 JWT token
   */
  private async generateTokenForUser(user: User): Promise<string> {
    // 使用 AuthService 的方法生成 token
    // 这里简化处理，实际应该调用 AuthService
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    // 返回一个占位符，实际需要使用 JwtService
    return `jwt_token_for_user_${user.id}`;
  }
}
