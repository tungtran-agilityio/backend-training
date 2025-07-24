import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  JwtPayload,
  ValidatedUser,
} from '../interfaces/common-response.interfaces';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not set');
    super({
      jwtFromRequest: (req: Request) => {
        const cookies = req?.cookies as Record<string, string> | undefined;
        if (cookies && typeof cookies['refresh_token'] === 'string') {
          return cookies['refresh_token'];
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): ValidatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
