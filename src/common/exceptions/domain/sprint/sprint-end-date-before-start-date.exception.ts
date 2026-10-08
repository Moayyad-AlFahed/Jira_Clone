import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../domain.exception';

export class SprintEndDateBeforeStartDateException extends DomainException {
  constructor(details?: Record<string, unknown>) {
    super(
      'Sprint end date cannot be before its start date',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'SPRINT_END_DATE_BEFORE_START_DATE',
      details,
    );
  }
}
