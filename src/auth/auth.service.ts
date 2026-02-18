import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus, UserInfo } from '../user/entities/user.entity';
import { UserToken } from '../user/entities/user-token.entity';
import { Peer } from '../heartbeat/entities/peer.entity';
import { LoginDto, RegisterDto, CurrentUserDto, LogoutDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  isAdmin: boolean;
  deviceId?: string;
}

export interface LoginResponse {
  access_token: string;
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

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private tokenRepository: Repository<UserToken>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    private jwtService: JwtService,
    private dataSource: DataSource,
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
    const { username, password, id, uuid, type, verificationCode, tfaCode, deviceInfo } = loginDto;

    // 根据登录类型处理
    if (type === 'sms_code' || type === 'email_code') {
      // 验证码登录
      return this.handleCodeLogin(loginDto);
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

    // 检查是否需要双因素认证
    if (user.tfaSecret) {
      if (!tfaCode) {
        return {
          access_token: '',
          type: 'tfa_check',
          tfa_type: 'totp',
          secret: user.tfaSecret,
        };
      }
      // TODO: 验证 TFA 代码
    }

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.id, id, uuid, deviceInfo);
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
   * 验证码登录（短信/邮箱）
   */
  private async handleCodeLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const { username, verificationCode, type, id, uuid, deviceInfo } = loginDto;

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
        username: username.replace(/[@.]/g, '_'),
        email: isEmail ? username : '',
        password: await bcrypt.hash(uuidv4(), 10),
        status: UserStatus.ACTIVE,
      });
      await this.userRepository.save(user);
    }

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.id, id, uuid, deviceInfo);
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

    // TODO: 实现 TFA 验证逻辑
    // 使用 otplib 或类似库验证 TOTP 代码

    // 查找用户
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 创建设备记录
    if (id || uuid) {
      await this.createOrUpdateDevice(user.id, id, uuid, deviceInfo);
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
   * 获取当前用户信息
   */
  async getCurrentUser(userId: number, currentUserDto?: CurrentUserDto): Promise<any> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
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
  async logout(userId: number, logoutDto: LogoutDto, token?: string | null): Promise<void> {
    const { id, uuid } = logoutDto;

    // 优先撤销当前 token
    if (token) {
      const result = await this.tokenRepository.update(
        { userId, token, isRevoked: false },
        { isRevoked: true },
      );
    }

    // 如果提供了设备信息，也撤销该设备的所有 token
    if (id || uuid) {
      const result = await this.tokenRepository.update(
        {
          userId,
          deviceId: id,
          deviceUuid: uuid,
          isRevoked: false,
        },
        { isRevoked: true },
      );
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
      sub: user.id,
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
      userId: user.id,
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
    userId: number,
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
      // 更新 peer 的 userId，绑定设备到用户
      peer.userId = userId;
      await this.peerRepository.save(peer);
    }
    // 如果 peer 不存在，设备会在心跳时自动创建
  }
}
