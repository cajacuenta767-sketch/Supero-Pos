import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface UserContext {
  id: string;
  username: string;
  role: string;
  branchId: string;
}

/**
 * Identidad del solicitante, tomada del token verificado.
 *
 * No acepta cabeceras ni valores por defecto: antes caía a `x-user-id`,
 * `x-branch-id` y, si nada llegaba, a `role: 'ADMIN'`. Un endpoint que lea al
 * usuario tiene que exigir uno de verdad.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserContext => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (!user?.id || !user?.role) {
    throw new UnauthorizedException({
      success: false,
      status_code: 401,
      message: 'Petición sin usuario autenticado.',
    });
  }

  return {
    id: String(user.id),
    username: user.username,
    role: user.role,
    branchId: String(user.branchId ?? ''),
  };
});
