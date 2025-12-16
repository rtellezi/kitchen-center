import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET')!,
    });
  }

  async validate(payload: any) {
    // Supabase JWT payload contains:
    // aud: 'authenticated', exp, sub (user_id), email, app_metadata, user_metadata, role
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role,
      aud: payload.aud
    };
  }
}

