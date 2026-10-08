import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class ProjectNameRequiredException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Project name is required',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PROJECT_NAME_REQUIRED',
      details,
    );
  }
}
