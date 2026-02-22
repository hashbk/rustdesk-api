import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../modules/user/entities/user-token.entity';
import { User } from '../../modules/user/entities/user.entity';

/**
 * JWT Payload 接口
 */
export interface JwtPayload {
  sub: number;
  username: string;
  email?: string;
  isAdmin: boolean;
  deviceId?: string;
}

/**
 * Token 服务
 * 统一管理 JWT Token 的生成和验证
 */
@Injectable()
export class TokenService {
  /**
   * Token 过期天数
   */
  private readonly TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
  ) {}

  /**
   * 生成 JWT Token 并保存到数据库
   * @param user 用户实体
   * @param deviceId 设备ID（可选）
   * @param deviceUuid 设备UUID（可选）
   * @returns 生成的 Token 字符串
   */
  async generateAndSaveToken(
    user: User,
    deviceId?: string,
    deviceUuid?: string,
  ): Promise<string> {
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
   * 验证 Token 是否有效
   * @param token Token 字符串
   * @returns JWT Payload 或 null
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
   * 撤销 Token
   * @param userId 用户ID
   * @param token Token 字符串
   */
  async revokeToken(userId: number, token: string): Promise<void> {
    await this.tokenRepository.update(
      { userId, token, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * 撤销用户的所有 Token
   * @param userId 用户ID
   */
  async revokeAllTokens(userId: number): Promise<void> {
    await this.tokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * 撤销设备的所有 Token
   * @param userId 用户ID
   * @param deviceId 设备ID
   * @param deviceUuid 设备UUID
   */
  async revokeDeviceTokens(
    userId: number,
    deviceId?: string,
    deviceUuid?: string,
  ): Promise<void> {
    await this.tokenRepository.update(
      {
        userId,
        deviceId,
        deviceUuid,
        isRevoked: false,
      },
      { isRevoked: true },
    );
  }
}
