import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre global d'exception.
 * Réponse uniforme : { success:false, message: string, code: number, errors?: any, path: string, timestamp }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur';
    let errors: unknown = undefined;
    let errorCode: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      if (typeof r === 'string') {
        message = r;
      } else {
        message = r?.message || message;
        errors = r?.errors || r?.details || r?.message || undefined;
        errorCode = r?.error || r?.code || undefined;
      }
    } else {
      this.logger.error(`Exception non gérée sur ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
      message =
        process.env.NODE_ENV === 'production'
          ? 'Erreur interne'
          : (exception as Error)?.message || message;
      if (process.env.NODE_ENV !== 'production') {
        errors = (exception as Error)?.stack;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorCode ?? HttpStatus[status],
      message,
      errors: Array.isArray(errors) ? errors : errors,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }
}
