import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { getJwtSecret } from './jwt.secret';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  branchId?: string | null;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
  branchId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  /**
   * Antes esto devolvía el contenido del token tal cual. Un usuario desactivado
   * conservaba el acceso hasta que su token caducaba, doce horas después, y el
   * rol viajaba congelado desde el momento del login. Ahora cada petición
   * confirma contra la base de datos que el usuario sigue existiendo y activo,
   * y toma su rol actual.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        success: false,
        status_code: 401,
        message: 'La sesión ya no es válida: el usuario está desactivado o no existe.',
      });
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role?.name ?? 'CAJERO',
      branchId: payload.branchId ?? user.branchId ?? null,
    };
  }
}
