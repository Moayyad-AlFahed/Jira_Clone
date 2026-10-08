import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class SprintAlreadyCompletedException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Sprint has already been completed',
      HttpStatus.CONFLICT,
      'SPRINT_ALREADY_COMPLETED',
      details,
    );
  }
}
