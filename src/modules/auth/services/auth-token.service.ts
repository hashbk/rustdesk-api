import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { UserToken } from '../../user/entities/user-token.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  email?: string;
  isAdmin: boolean;
  deviceId?: string;
}

@Injectable()
export class AuthTokenService {
  private readonly TOKEN_EXPIRY_DAYS = 30; // Token 有效期 30 天

  constructor(
    @InjectRepository(UserToken)
    private tokenRepository: Repository<UserToken>,
    private jwtService: JwtService,
  ) {}

  /**
   * 生成 JWT Token
   */
  async generateToken(user: User, deviceId?: string, deviceUuid?: string): Promise<string> {
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
   * 撤销 Token
   */
  async revokeToken(userGuid: string, token: string): Promise<void> {
    await this.tokenRepository.update(
      { userGuid, token, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * 撤销用户设备的所有 Token
   */
  async revokeDeviceTokens(userGuid: string, deviceId?: string, deviceUuid?: string): Promise<void> {
    if (!deviceId && !deviceUuid) return;

    await this.tokenRepository.update(
      {
        userGuid,
        deviceId,
        deviceUuid,
        isRevoked: false,
      },
      { isRevoked: true },
    );
  }
}
