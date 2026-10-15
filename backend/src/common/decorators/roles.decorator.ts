import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/**
 * Décorateur pour restreindre un endpoint à certains rôles.
 * Usage : @Roles(Role.STUDENT, Role.AGENT)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
