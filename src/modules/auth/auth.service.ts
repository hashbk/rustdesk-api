import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import { User, UserStatus, UserInfo } from '../user/entities/user.entity';
import { UserToken } from '../user/entities/user-token.entity';
import { Peer } from '../../common/entities';
import { LoginDto, RegisterDto, CurrentUserDto, LogoutDto } from './dto/auth.dto';
import { JwtPayload } from '../../common/services/token.service';
import { EmailVerificationSession } from './entities/email-verification-session.entity';
import { EmailService } from '../email/email.service';

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
  private readonly TOKEN_EXPIRY_DAYS = 30; // Token 有效期 30 天
  private readonly VERIFICATION_CODE_EXPIRY_MINUTES = 5; // 验证码有效期 5 分钟

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private tokenRepository: Repository<UserToken>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(EmailVerificationSession)
    private verificationSessionRepository: Repository<EmailVerificationSession>,
    private jwtService: JwtService,
    private emailService: EmailService,
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
      return this.handleEmailCodeLogin(loginDto);
    }

    if (type === 'sms_code') {
      // 短信验证码登录功能正在开发中，暂时禁用
      throw new BadRequestException('短信验证码登录功能正在开发中，暂时不可用');
    }

    if (type === 'tfa_code') {
      // 双因素认证登录
      return this.handleTfaLogin(loginDto);
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
      return this.initiateEmailVerification(user);
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
      const isValidTfa = this.verifyTfaCode(user.tfaSecret, tfaCode);
      if (!isValidTfa) {
        throw new UnauthorizedException('双因素认证验证码错误');
      }
    }

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.guid, id, uuid, deviceInfo);
    }

    // 生成 Token
    const token = await this.generateToken(user, id, uuid);

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
   * 发起邮箱验证（生成验证码并发送邮件）
   */
  private async initiateEmailVerification(user: User): Promise<LoginResponse> {
    // 生成 6 位验证码
    const code = Math.random().toString().slice(-6);

    // 生成 secret（用于关联两次请求）
    const secret = uuidv4();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.VERIFICATION_CODE_EXPIRY_MINUTES);

    // 删除该用户之前的验证会话
    await this.verificationSessionRepository.delete({ userGuid: user.guid, used: false });

    // 创建验证会话
    const session = this.verificationSessionRepository.create({
      guid: uuidv4(),
      secret,
      userGuid: user.guid,
      email: user.email,
      code,
      expiresAt,
      used: false,
    });
    await this.verificationSessionRepository.save(session);

    // 发送验证码邮件
    const sent = await this.emailService.sendVerificationCode(user.email, code);
    if (!sent) {
      throw new BadRequestException('发送验证码邮件失败，请稍后重试');
    }

    this.logger.log(`用户 ${user.username} 登录需要邮箱验证，验证码已发送至 ${user.email}`);

    return {
      type: 'email_check',
      tfa_type: 'email_check',
      secret,
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
   * 邮箱验证码登录（第二步验证）
   */
  private async handleEmailCodeLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const { username, verificationCode, secret, id, uuid, deviceInfo } = loginDto;

    if (!username || !verificationCode || !secret) {
      throw new BadRequestException('验证参数不完整');
    }

    // 查找验证会话
    const session = await this.verificationSessionRepository.findOne({
      where: {
        secret,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!session) {
      throw new UnauthorizedException('验证码已过期或无效，请重新登录');
    }

    // 验证验证码
    if (session.code !== verificationCode) {
      throw new UnauthorizedException('验证码错误');
    }

    // 查找用户
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username OR user.email = :email', { username, email: username })
      .addSelect('user.info')
      .addSelect('user.thirdAuthType')
      .getOne();

    if (!user || user.guid !== session.userGuid) {
      throw new UnauthorizedException('用户信息不匹配');
    }

    // 检查用户状态
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 标记验证会话为已使用
    session.used = true;
    await this.verificationSessionRepository.save(session);

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.guid, id, uuid, deviceInfo);
    }

    // 生成 Token
    const token = await this.generateToken(user, id, uuid);

    this.logger.log(`用户 ${user.username} 邮箱验证成功，已登录`);

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
   * 验证码登录（短信/邮箱/TFA）
   */
  private async handleCodeLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const { username, verificationCode, tfaCode, secret, type, id, uuid, deviceInfo } = loginDto;

    // 如果包含 tfaCode 和 secret，则进行 TFA 验证
    if (tfaCode && secret) {
      return this.handleTfaLogin(loginDto);
    }

    if (!username || !verificationCode) {
      throw new BadRequestException('用户名和验证码不能为空');
    }

    // TODO: 实现验证码验证逻辑
    // 这里需要根据 type 判断是短信还是邮箱验证码
    // 并验证验证码是否正确

    // 查找或创建用户
    let user = await this.userRepository.findOne({
      where: type === 'sms_code'
        ? { username } // 假设 username 是手机号
        : { email: username }, // 假设 username 是邮箱
    });

    if (!user) {
      // 自动创建用户
      const isEmail = type === 'email_code';
      user = this.userRepository.create({
        guid: uuidv4(),
        username: username.replace(/[@.]/g, '_'),
        email: isEmail ? username : '',
        password: await bcrypt.hash(uuidv4(), 10),
        status: UserStatus.ACTIVE,
      });
      await this.userRepository.save(user);
    }

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.guid, id, uuid, deviceInfo);
    }

    // 生成 Token
    const token = await this.generateToken(user, id, uuid);

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
   * 双因素认证登录
   */
  private async handleTfaLogin(loginDto: LoginDto): Promise<LoginResponse> {
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
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.guid, id, uuid, deviceInfo);
    }

    // 生成 Token
    const token = await this.generateToken(user, id, uuid);

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
   * 验证 TFA 验证码
   */
  private verifyTfaCode(secret: string, code: string): boolean {
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
      await this.tokenRepository.update(
        { userGuid, token, isRevoked: false },
        { isRevoked: true },
      );
    }

    // 如果提供了设备信息，撤销该设备的所有 token 并解除设备绑定
    if (id || uuid) {
      // 撤销该设备的所有 token
      await this.tokenRepository.update(
        {
          userGuid,
          deviceId: id,
          deviceUuid: uuid,
          isRevoked: false,
        },
        { isRevoked: true },
      );

      // 解除设备与用户的绑定（安全关键：防止退出登录后设备仍关联用户）
      if (uuid) {
        const peer = await this.peerRepository.findOne({
          where: { uuid, userGuid },
        });

        if (peer) {
          peer.userGuid = null as any;
          await this.peerRepository.save(peer);
          this.logger.log(`用户 ${userGuid} 退出登录，已解除设备 ${uuid} 的绑定`);
        }
      }
    }
  }

  /**
   * 验证 JWT Token
   */
  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      // 检查 Token 是否被撤销
      const tokenRecord = await this.tokenRepository.findOne({
        where: { token, isRevoked: false },
      });

      if (!tokenRecord) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 生成 JWT Token
   */
  private async generateToken(user: User, deviceId?: string, deviceUuid?: string): Promise<string> {
    const payload: JwtPayload = {
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

    const userToken = this.tokenRepository.create({
      guid: uuidv4(),
      userGuid: user.guid,
      token,
      deviceId,
      deviceUuid,
      expiresAt,
    });

    await this.tokenRepository.save(userToken);

    return token;
  }

  /**
   * 创建或更新设备记录（绑定设备到用户）
   */
  private async createOrUpdateDevice(
    userGuid: string,
    deviceId?: string,
    deviceUuid?: string,
    deviceInfo?: Record<string, any>,
  ): Promise<void> {
    if (!deviceUuid) return;

    // 查找 peer 记录
    const peer = await this.peerRepository.findOne({
      where: { uuid: deviceUuid },
    });

    if (peer) {
      // 更新 peer 的 userGuid，绑定设备到用户
      peer.userGuid = userGuid;
      await this.peerRepository.save(peer);
    }
    // 如果 peer 不存在，设备会在心跳时自动创建
  }
}
