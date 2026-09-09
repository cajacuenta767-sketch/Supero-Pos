import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserContext {
  id: string;
  username: string;
  role: string;
  branchId: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user || {};
    const branchId = request.headers['x-branch-id'] || user.branchId || 'branch-1';
    const userId = user.id || request.headers['x-user-id'] || 'usr-admin';

    return {
      id: String(userId),
      username: user.username || 'admin',
      role: user.role || 'ADMIN',
      branchId: String(branchId),
    };
  },
);
