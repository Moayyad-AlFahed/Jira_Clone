import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: HttpStatus,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super({ error: message, code, details }, status);
    this.code = code;
    this.details = details;
  }
}
