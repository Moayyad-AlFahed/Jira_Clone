import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class CannotRemoveLastProjectAdminException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Cannot remove the last project administrator',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CANNOT_REMOVE_LAST_PROJECT_ADMIN',
      details,
    );
  }
}
