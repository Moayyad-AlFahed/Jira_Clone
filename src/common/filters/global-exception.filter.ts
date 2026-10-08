import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { BusinessException } from '../exceptions/business/business.exception';
import {
  isPrismaError,
  mapPrismaError,
} from '../exceptions/infrastructure/prisma.exception';

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = this.resolveStatus(exception);
    const error = this.resolveError(exception);

    const body = {
      success: false,
      statusCode: status,
      error,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest<Request>().url,
    };

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (isPrismaError(exception)) {
      return (
        mapPrismaError(exception)?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveError(exception: unknown): ErrorPayload {
    if (
      exception instanceof DomainException ||
      exception instanceof BusinessException
    ) {
      const body = exception.getResponse() as {
        error?: string;
        code?: string;
        details?: unknown;
      };
      return {
        code: body.code ?? exception.code,
        message: body.error ?? exception.message,
        details: exception.details,
      };
    }

    if (this.isMulterError(exception)) {
      return {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the allowed limit',
      };
    }

    if (isPrismaError(exception)) {
      const mapped = mapPrismaError(exception);
      if (mapped) {
        return {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details,
        };
      }
      this.logUnsafe(exception);
      return this.internalServerError();
    }

    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    this.logUnsafe(exception);
    return this.internalServerError();
  }

  private resolveHttpException(exception: HttpException): ErrorPayload {
    const status = exception.getStatus();
    const raw = exception.getResponse();

    if (typeof raw === 'string') {
      return {
        code: STATUS_CODE_MAP[status] ?? 'HTTP_ERROR',
        message: raw,
      };
    }

    const body = raw as { message?: unknown; error?: string };

    if (Array.isArray(body.message)) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: body.message,
      };
    }

    return {
      code: STATUS_CODE_MAP[status] ?? 'HTTP_ERROR',
      message:
        typeof body.message === 'string'
          ? body.message
          : typeof body.error === 'string'
            ? body.error
            : 'Request failed',
    };
  }

  private isMulterError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      (exception as { name: string }).name === 'MulterError'
    );
  }

  private internalServerError(): ErrorPayload {
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
  }

  private logUnsafe(exception: unknown): void {
    this.logger.error(exception);
  }
}
