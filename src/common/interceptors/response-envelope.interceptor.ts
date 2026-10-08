import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${period}`;
}

function formatDates(value: unknown): unknown {
  if (value instanceof Date) {
    return formatDate(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatDates);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, formatDates(val)]),
    );
  }

  return value;
}

/**
 * Pass through already-enveloped payloads `{ data?, message? }`.
 * Wrap any other truthy return value as `{ data }`.
 * Formats any Date instances into a readable string.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value === undefined || value === null) {
          return value;
        }
        if (
          typeof value === 'object' &&
          ('data' in value || 'message' in value)
        ) {
          return formatDates(value);
        }
        return { data: formatDates(value) };
      }),
    );
  }
}
