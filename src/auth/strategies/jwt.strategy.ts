import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'rustdesk-api-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const { sub, username, email, isAdmin } = payload;
    
    return {
      id: sub,
      username,
      email,
      isAdmin,
    };
  }
}
