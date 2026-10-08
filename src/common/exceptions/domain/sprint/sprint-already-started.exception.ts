import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class SprintAlreadyStartedException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Sprint has already started and cannot be modified',
      HttpStatus.CONFLICT,
      'SPRINT_ALREADY_STARTED',
      details,
    );
  }
}
