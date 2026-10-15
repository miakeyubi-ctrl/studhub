import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Équivalent léger d'un voter Symfony :
 * si ce n'est pas ton annonce / ressource, tu ne peux pas la modifier.
 */
export function assertOwner(
  entity: Record<string, any> | null | undefined,
  ownerField: string,
  currentId: number,
  options?: { notFound?: string; forbidden?: string },
): asserts entity is Record<string, any> {
  if (!entity) {
    throw new NotFoundException(options?.notFound || 'Ressource introuvable');
  }
  if (Number(entity[ownerField]) !== Number(currentId)) {
    throw new ForbiddenException(
      options?.forbidden || 'Vous ne pouvez pas modifier cette annonce',
    );
  }
}
