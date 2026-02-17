import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../user/entities/user.entity';
import { OidcProvider } from '../oidc/entities/oidc-provider.entity';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OidcProvider)
    private oidcProviderRepository: Repository<OidcProvider>,
  ) {}

  async onModuleInit() {
    await this.createDefaultAdmin();
    await this.createDefaultOidcProviders();
  }

  /**
   * 创建默认管理员账户
   */
  private async createDefaultAdmin() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await this.userRepository.findOne({
      where: { username: adminUsername },
    });

    if (!existingAdmin) {
      const admin = this.userRepository.create({
        username: adminUsername,
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        status: UserStatus.ACTIVE,
        isAdmin: true,
        note: 'Default administrator account',
      });

      await this.userRepository.save(admin);
      this.logger.log(`Default admin user created: ${adminUsername}`);
      this.logger.warn(`Please change the default password for user: ${adminUsername}`);
    } else {
      this.logger.log('Admin user already exists, skipping creation');
    }
  }

  /**
   * 创建默认 OIDC 提供商配置
   */
  private async createDefaultOidcProviders() {
    const defaultProviders = [
      {
        name: 'google',
        issuer: 'https://accounts.google.com',
        clientId: '',
        clientSecret: '',
        scope: 'openid email profile',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
        enabled: false,
        priority: 1,
      },
      {
        name: 'github',
        issuer: 'https://github.com',
        clientId: '',
        clientSecret: '',
        scope: 'read:user user:email',
        authorizationEndpoint: 'https://github.com/login/oauth/authorize',
        tokenEndpoint: 'https://github.com/login/oauth/access_token',
        userinfoEndpoint: 'https://api.github.com/user',
        enabled: false,
        priority: 2,
      },
    ];

    for (const providerData of defaultProviders) {
      const existing = await this.oidcProviderRepository.findOne({
        where: { name: providerData.name },
      });

      if (!existing) {
        const provider = this.oidcProviderRepository.create(providerData);
        await this.oidcProviderRepository.save(provider);
        this.logger.log(`Default OIDC provider created: ${providerData.name}`);
      }
    }
  }
}
