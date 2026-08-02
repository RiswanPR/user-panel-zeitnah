import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ProfileOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const userId = user._id || user.id || user.sub;
    const targetUserId = request.params.userId || request.body.userId;

    if (targetUserId && targetUserId !== userId) {
      throw new ForbiddenException(
        'Security Check: You can only edit or update your own profile resources',
      );
    }

    return true;
  }
}
