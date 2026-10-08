import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class InvalidStatusTransitionException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'The requested status transition is not allowed',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_STATUS_TRANSITION',
      details,
    );
  }
}
