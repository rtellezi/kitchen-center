import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import { Strategy } from 'passport-custom';

export type AuthUser = {
  userId: string;
  email?: string;
  role?: string;
  aud?: string | string[];
};

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly hs256Key: Uint8Array | null;

  constructor(configService: ConfigService) {
    super();

    const supabaseUrl = (configService.get<string>('SUPABASE_URL') || '').replace(/\/+$/, '');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required for JWT verification (JWKS)');
    }

    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));

    // Optional fallback while Legacy HS256 is still CURRENT (or previously used keys remain).
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');
    this.hs256Key = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
  }

  async validate(req: Request): Promise<AuthUser> {
    const token = this.extractBearer(req);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = await this.verifyToken(token);
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
      aud: payload.aud,
    };
  }

  private extractBearer(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    const token = header.slice('Bearer '.length).trim();
    return token || null;
  }

  private async verifyToken(token: string): Promise<JWTPayload> {
    const verifyOptions = {
      issuer: this.issuer,
      audience: 'authenticated',
    };

    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new UnauthorizedException('Malformed token');
    }

    // Asymmetric keys (ECC/RSA) after JWT signing-key rotation → JWKS
    if (alg && alg !== 'HS256') {
      try {
        const { payload } = await jwtVerify(token, this.jwks, verifyOptions);
        return payload;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    // Legacy / still-current HS256 shared secret
    if (this.hs256Key) {
      try {
        const { payload } = await jwtVerify(token, this.hs256Key, {
          ...verifyOptions,
          algorithms: ['HS256'],
        });
        return payload;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, verifyOptions);
      return payload;
    } catch {
      throw new UnauthorizedException(
        'Unable to verify token: configure SUPABASE_JWT_SECRET for HS256 or rotate to asymmetric JWKS keys',
      );
    }
  }
}
