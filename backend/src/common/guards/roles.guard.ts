import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRole = user?.role || request.headers['x-user-role'];

    if (!userRole) {
      throw new ForbiddenException({
        type: 'https://httpstatuses.com/403',
        title: 'Forbidden',
        status: 403,
        detail: 'Acceso denegado: El usuario no posee un rol válido.',
        instance: request.url,
        success: false,
        status_code: 403,
        message: 'Acceso denegado: El usuario no posee un rol válido.',
      });
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException({
        type: 'https://httpstatuses.com/403',
        title: 'Forbidden',
        status: 403,
        detail: `Acceso restringido: Se requiere uno de los siguientes roles: [${requiredRoles.join(', ')}]`,
        instance: request.url,
        success: false,
        status_code: 403,
        message: `Acceso restringido: Se requiere uno de los siguientes roles: [${requiredRoles.join(', ')}]`,
      });
    }

    return true;
  }
}
