import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus, UserInfo } from '../../user/entities/user.entity';
import { UserToken } from '../../user/entities/user-token.entity';
import { Peer } from '../../../common/entities';
import { LoginDto, RegisterDto, CurrentUserDto, LogoutDto } from '../dto/auth.dto';
import { EmailVerificationSession } from '../entities/email-verification-session.entity';
import { EmailService } from '../../email/email.service';
import { AuthTokenService, JwtPayload } from './auth-token.service';
import { AuthTfaService } from './auth-tfa.service';
import { AuthEmailService } from './auth-email.service';
import { AuthDeviceService } from './auth-device.service';

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
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private tokenRepository: Repository<UserToken>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(EmailVerificationSession)
    private verificationSessionRepository: Repository<EmailVerificationSession>,
    private readonly emailService: EmailService,
    private readonly tokenService: AuthTokenService,
    private readonly tfaService: AuthTfaService,
    private readonly emailAuthService: AuthEmailService,
    private readonly deviceService: AuthDeviceService,
  ) {}

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { username, email, password, note } = registerDto;

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('用户名已存在');
      }
      throw new ConflictException('邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.userRepository.create({
      guid: uuidv4(),
      username,
      email,
      password: hashedPassword,
      note: note || '',
      status: UserStatus.ACTIVE,
      isAdmin: false,
    });

    await this.userRepository.save(user);

    return { message: '注册成功' };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { username, password, id, uuid, type, verificationCode, tfaCode, secret, deviceInfo } = loginDto;

    // 根据登录类型处理
    if (type === 'email_code') {
      // 邮箱验证码验证（第二步）
      return this.emailAuthService.handleEmailCodeLogin(
        loginDto,
        this.tokenService.generateToken.bind(this.tokenService),
        this.deviceService.createOrUpdateDevice.bind(this.deviceService),
      );
    }

    if (type === 'sms_code') {
      // 短信验证码登录功能正在开发中，暂时禁用
      throw new BadRequestException('短信验证码登录功能正在开发中，暂时不可用');
    }

    if (type === 'tfa_code') {
      // 双因素认证登录
      return this.tfaService.handleTfaLogin(
        loginDto,
        this.tokenService.generateToken.bind(this.tokenService),
        this.deviceService.createOrUpdateDevice.bind(this.deviceService),
      );
    }

    // 账号密码登录
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    // 查找用户
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username OR user.email = :email', { username, email: username })
      .addSelect('user.password')
      .addSelect('user.tfaSecret')
      .addSelect('user.info')
      .addSelect('user.thirdAuthType')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('账户已被禁用');
    }

    if (user.status === UserStatus.UNVERIFIED) {
      throw new UnauthorizedException('请先验证邮箱');
    }

    // 检查是否需要邮箱验证（用户设置中开启了 email_verification）
    const userInfo = user.getUserInfo();
    if (userInfo?.email_verification && user.email) {
      // 生成验证码会话并发送邮件
      return this.emailAuthService.initiateEmailVerification(user);
    }

    // 检查是否需要双因素认证
    if (user.tfaSecret) {
      if (!tfaCode) {
        return {
          type: 'email_check',
          tfa_type: 'tfa_check',
          secret: user.tfaSecret,
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
      // 验证 TFA 代码
      const isValidTfa = this.tfaService.verifyTfaCode(user.tfaSecret, tfaCode);
      if (!isValidTfa) {
        throw new UnauthorizedException('双因素认证验证码错误');
      }
    }

    // 创建设备记录
    if (id || uuid) {
      await this.deviceService.createOrUpdateDevice(user.guid, id, uuid, deviceInfo);
    }

    // 生成 Token
    const token = await this.tokenService.generateToken(user, id, uuid);

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

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userGuid: string, currentUserDto?: CurrentUserDto): Promise<any> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.guid = :guid', { guid: userGuid })
      .addSelect('user.info')
      .addSelect('user.thirdAuthType')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      name: user.username,
      email: user.email || undefined,
      note: user.note || undefined,
      verifier: user.verifier || undefined,
      status: user.status,
      info: user.getUserInfo(),
      is_admin: user.isAdmin,
      third_auth_type: user.thirdAuthType || undefined,
    };
  }

  /**
   * 用户登出
   */
  async logout(userGuid: string, logoutDto: LogoutDto, token?: string | null): Promise<void> {
    const { id, uuid } = logoutDto;

    // 优先撤销当前 token
    if (token) {
      await this.tokenService.revokeToken(userGuid, token);
    }

    // 如果提供了设备信息，撤销该设备的所有 token 并解除设备绑定
    if (id || uuid) {
      // 撤销该设备的所有 token
      await this.tokenService.revokeDeviceTokens(userGuid, id, uuid);

      // 解除设备与用户的绑定（安全关键：防止退出登录后设备仍关联用户）
      if (uuid) {
        await this.deviceService.unbindDevice(userGuid, uuid);
      }
    }
  }

  /**
   * 验证 JWT Token
   */
  async validateToken(token: string): Promise<JwtPayload | null> {
    return this.tokenService.validateToken(token);
  }
}
