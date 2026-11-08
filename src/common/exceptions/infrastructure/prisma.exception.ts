import { HttpStatus } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

export interface PrismaErrorResponse {
  status: HttpStatus;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const KNOWN_CODE_ACTIONS: Record<
  string,
  Pick<PrismaErrorResponse, 'status' | 'code' | 'message'>
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    code: 'UNIQUE_CONSTRAINT',
    message: 'A record with the same value already exists',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    code: 'FOREIGN_KEY_CONSTRAINT',
    message: 'The requested operation references an invalid record',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: 'NOT_FOUND',
    message: 'The requested record was not found',
  },
  P2039: {
    status: HttpStatus.BAD_REQUEST,
    code: 'INVALID_DATABASE_QUERY',
    message: 'The request could not be processed',
  },
};

export function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientInitializationError
  );
}

/**
 * Map a Prisma error to a safe, client-safe HTTP response.
 * Returns null when the error is not a recognized Prisma error type.
 */
export function mapPrismaError(error: unknown): PrismaErrorResponse | null {
  if (!isPrismaError(error)) {
    return null;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'DATABASE_VALIDATION_ERROR',
      message: 'The request could not be processed',
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database is temporarily unavailable',
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'INVALID_REQUEST',
      message: 'The request could not be processed',
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'DATABASE_ERROR',
      message: 'Database is temporarily unavailable',
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const known = KNOWN_CODE_ACTIONS[error.code];
    if (known) {
      return known;
    }

    if (error.code.startsWith('P2')) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REQUEST',
        message: 'The request could not be processed',
      };
    }

    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'DATABASE_ERROR',
      message: 'The request could not be processed',
    };
  }

  return null;
}
