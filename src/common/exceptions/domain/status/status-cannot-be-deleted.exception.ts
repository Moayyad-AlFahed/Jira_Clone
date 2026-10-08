import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class StatusCannotBeDeletedException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Status cannot be deleted because it is in use',
      HttpStatus.CONFLICT,
      'STATUS_CANNOT_BE_DELETED',
      details,
    );
  }
}
