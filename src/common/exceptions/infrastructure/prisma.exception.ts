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
 * Map an unknown error to a safe, client-safe HTTP response.
 * Returns null when the error is not a Prisma error.
 *
 * Never exposes raw Prisma messages, SQL, meta, or internal details.
 */
export function mapPrismaError(error: unknown): PrismaErrorResponse | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

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
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  };
}
