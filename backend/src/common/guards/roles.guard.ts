import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    /* El rol sale EXCLUSIVAMENTE del token verificado que dejó JwtAuthGuard en
       `request.user`. Antes existía un respaldo por cabecera `x-user-role`, y
       como ningún controlador aplicaba JwtAuthGuard, `request.user` nunca
       existía: cualquiera se declaraba ADMIN con una cabecera. */
    const userRole: string | undefined = request.user?.role;

    if (!userRole) {
      throw new ForbiddenException({
        success: false,
        status_code: 403,
        message: 'Acceso denegado: el usuario no posee un rol válido.',
      });
    }

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException({
        success: false,
        status_code: 403,
        message: `Acceso restringido: se requiere uno de los siguientes roles: [${requiredRoles.join(', ')}].`,
      });
    }

    return true;
  }
}
