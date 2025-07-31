import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Rollbar from 'rollbar';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly rollbar: Rollbar;

  constructor() {
    this.rollbar = new Rollbar({
      accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
      environment: process.env.NODE_ENV || 'development',
      captureUncaught: true,
      captureUnhandledRejections: true,
      // Only send to Rollbar in production/staging
      // enabled: process.env.NODE_ENV !== 'development',
    });
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      // Make sure response is JSON
      errorResponse =
        typeof responseBody === 'string'
          ? { message: responseBody }
          : responseBody;

      if (status >= 500) {
        this.logToRollbar(exception, request, status);
      }

      response.status(status).json(errorResponse);
    } else {
      // Handle unknown error
      status = HttpStatus.INTERNAL_SERVER_ERROR;

      this.logToRollbar(exception, request, status);

      // Return consistent JSON response
      errorResponse = {
        statusCode: status,
        message: exception?.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      };

      response.status(status).json(errorResponse);
    }
  }

  private logToRollbar(exception: any, request: Request, statusCode: number) {
    // Create a clean request context without sensitive data
    const requestData = {
      url: request.url,
      method: request.method,
      query: request.query,
      body: this.sanitizeBody(request.body),
      headers: this.sanitizeHeaders(request.headers),
      user: request.user || null,
      statusCode,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
    };

    this.rollbar.error(exception, requestData);
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
