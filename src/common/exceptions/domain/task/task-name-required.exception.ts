import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class TaskNameRequiredException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Task name is required',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'TASK_NAME_REQUIRED',
      details,
    );
  }
}
