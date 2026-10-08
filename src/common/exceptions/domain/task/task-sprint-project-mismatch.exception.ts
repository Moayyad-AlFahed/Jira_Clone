import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class TaskSprintProjectMismatchException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Task belongs to a project that does not match the selected sprint',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'TASK_SPRINT_PROJECT_MISMATCH',
      details,
    );
  }
}
