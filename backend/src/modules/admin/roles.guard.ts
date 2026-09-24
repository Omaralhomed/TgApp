import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    const role = (user.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OWNER') {
      return true;
    }

    throw new ForbiddenException('Access Denied: Super Administrator privileges required.');
  }
}
