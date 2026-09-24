import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = res.message || message;
        errors = res.errors || (Array.isArray(res.message) ? res.message : null);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.stack}`);
    }

    // Mask sensitive details from error messages
    const sanitizedMessage = String(message)
      .replace(/api_hash=[a-zA-Z0-9]+/gi, 'api_hash=***')
      .replace(/sessionString=[a-zA-Z0-9:_=-]+/gi, 'sessionString=***')
      .replace(/password=[^&\s]+/gi, 'password=***');

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: sanitizedMessage,
      errors: errors,
    });
  }
}
