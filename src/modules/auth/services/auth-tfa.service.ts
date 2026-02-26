import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import { User, UserInfo } from '../../user/entities/user.entity';
import { LoginDto } from '../dto/auth.dto';
import { JwtPayload } from './auth-token.service';

export interface LoginResponse {
  access_token?: string;
  type: string;
  tfa_type?: string;
  secret?: string;
  user?: {
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
export class AuthTfaService {
  private readonly logger = new Logger(AuthTfaService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 验证 TFA 验证码
   */
  verifyTfaCode(secret: string, code: string): boolean {
    try {
      return authenticator.verify({
        secret,
        token: code,
      });
    } catch (error) {
      this.logger.error('TFA 验证失败', error);
      return false;
    }
  }

  /**
   * 双因素认证登录
   */
  async handleTfaLogin(
    loginDto: LoginDto,
    generateToken: (user: User, deviceId?: string, deviceUuid?: string) => Promise<string>,
    createOrUpdateDevice?: (userGuid: string, deviceId?: string, deviceUuid?: string, deviceInfo?: Record<string, any>) => Promise<void>,
  ): Promise<LoginResponse> {
    const { username, tfaCode, secret, id, uuid, deviceInfo } = loginDto;

    if (!tfaCode || !secret) {
      throw new BadRequestException('双因素认证参数不完整');
    }

    // 验证 TFA 代码
    const isValidTfa = this.verifyTfaCode(secret, tfaCode);
    if (!isValidTfa) {
      throw new UnauthorizedException('双因素认证验证码错误');
    }

    // 查找用户
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username OR user.email = :email', { username, email: username })
      .addSelect('user.tfaSecret')
      .addSelect('user.info')
      .addSelect('user.thirdAuthType')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证 secret 是否与用户的 tfaSecret 匹配
    if (user.tfaSecret !== secret) {
      throw new UnauthorizedException('双因素认证参数无效');
    }

    // 检查用户状态
    if (user.status === 0) { // UserStatus.DISABLED
      throw new UnauthorizedException('账户已被禁用');
    }

    // 创建设备记录
    if (createOrUpdateDevice && (id || uuid)) {
      await createOrUpdateDevice(user.guid, id, uuid, deviceInfo);
    }

    // 生成 Token
    const token = await generateToken(user, id, uuid);

    return {
      access_token: token,
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
}
