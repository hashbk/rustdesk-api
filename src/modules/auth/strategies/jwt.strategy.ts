import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../../../common/services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'rustdesk-api-secret-key-change-in-production',
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
      id: sub,
      username,
      email,
      isAdmin,
    };
  }
}
