
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { Prisma } from 'src/generated/prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof DomainException) {
      const body = exception.getResponse() as Record<string, unknown>;
      return res.status(exception.getStatus()).json(body);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'object' && raw !== null && 'error' in raw) {
        return res.status(status).json(raw);
      }

      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray((raw as { message?: unknown }).message)
            ? 'بيانات غير صالحة'
            : ((raw as { message?: string }).message ?? 'حدث خطأ غير متوقع');

      const details =
        typeof raw === 'object' &&
        raw !== null &&
        Array.isArray((raw as { message?: unknown }).message)
          ? { validation: (raw as { message: string[] }).message }
          : undefined;

      return res.status(status).json({ error: message, details });
    }

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      (exception as { name: string }).name === 'MulterError'
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'حجم الملف يتجاوز الحد المسموح',
      });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 'العنصر غير موجود',
        });
      }
      if (exception.code === 'P2003') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'مرجع غير صالح',
        });
      }
    }

    this.logger.error(exception);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'حدث خطأ غير متوقع',
    });
  }
}
