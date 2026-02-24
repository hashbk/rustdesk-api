import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../../../common/services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private authService: AuthService) {
    const jwtSecret = process.env.JWT_SECRET || 'rustdesk-api-secret-key-change-in-production';
    
    // 检查是否使用默认 JWT 密钥
    if (!process.env.JWT_SECRET) {
      const logger = new Logger('JwtStrategy');
      logger.warn('WARNING: Using default JWT secret key. Please set JWT_SECRET environment variable in production!');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<any> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // Token 不存在时直接拒绝
    if (!token) {
      throw new UnauthorizedException('Token 无效');
    }

    // 验证 Token 是否被撤销
    const validPayload = await this.authService.validateToken(token);
    if (!validPayload) {
      throw new UnauthorizedException('Token 已失效或被撤销');
    }

    const { sub, username, email, isAdmin } = payload;

    return {
      guid: sub,
      username,
      email,
      isAdmin,
    };
  }
}
