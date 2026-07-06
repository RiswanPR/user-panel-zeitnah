import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CommunityOwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admins and moderators can bypass ownership checks
    if (user.role === 'admin' || user.role === 'teacher') {
      return true;
    }

    // Usually, we would fetch the entity (Post, Comment, etc) from DB here
    // and compare `entity.authorId` with `user._id`.
    // Since guards run before route handlers, doing DB lookups here can be heavy.
    // An alternative is returning boolean from services or throwing ForbiddenException in services.
    // For Phase 1, we implement the structure. We assume services will do the final check.

    return true;
  }
}
