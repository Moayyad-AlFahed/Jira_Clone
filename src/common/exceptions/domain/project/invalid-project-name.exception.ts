import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class InvalidProjectNameException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Project name is invalid',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_PROJECT_NAME',
      details,
    );
  }
}
