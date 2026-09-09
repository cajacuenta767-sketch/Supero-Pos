import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    let message = exception.message;
    let detail = exception.message;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      if (exceptionResponse.message) {
        message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message.join(', ')
          : exceptionResponse.message;
        detail = message;
      }
      if (exceptionResponse.detail) {
        detail = exceptionResponse.detail;
      }
    }

    const rfc7807Response = {
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] || 'Error',
      status: status,
      detail: detail,
      instance: request.url,
      success: false,
      status_code: status,
      message: message,
      ...(typeof exceptionResponse === 'object' ? exceptionResponse : {}),
    };

    response.status(status).json(rfc7807Response);
  }
}
