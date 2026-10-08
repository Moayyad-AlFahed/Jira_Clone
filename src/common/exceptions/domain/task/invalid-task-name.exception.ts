import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class InvalidTaskNameException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Task name is invalid',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_TASK_NAME',
      details,
    );
  }
}
