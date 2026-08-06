import type { EnvConfig } from '@/config/env.config';
import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';
    let error = 'Internal Server Error';
    let details: unknown = null;

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Validation failed';
        error = 'Bad Request';
        details = zodError.issues;

        this.logger.error(
          `Validation Error: ${request.method} ${request.url}`,
          { issues: zodError.issues, stack: exception.stack },
        );
      }
    } else if (
      exception instanceof Error &&
      exception.constructor.name === 'ZodSerializationException'
    ) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Response serialization failed';
      error = 'ZodSerializationException';

      const zodError = (
        exception as Error & { getZodError?: () => unknown }
      ).getZodError?.();
      if (zodError instanceof ZodError) {
        details = zodError.issues;
        this.logger.error(
          `Serialization Error: ${request.method} ${request.url}`,
          { issues: zodError.issues, stack: exception.stack },
        );
      } else {
        this.logger.error(
          `Serialization Error: ${request.method} ${request.url}`,
          { exception, stack: exception.stack },
        );
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) ?? message;
        error = (responseObj.error as string) ?? exception.constructor.name;

        if (responseObj.details) {
          details = responseObj.details;
        }
      }

      this.logger.error(`HTTP Exception: ${request.method} ${request.url}`, {
        statusCode,
        message,
        error,
        stack: exception.stack,
      });
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      this.logger.error(
        `Unhandled Error: ${request.method} ${request.url}`,
        exception,
      );
    } else {
      this.logger.error(
        `Unknown Exception: ${request.method} ${request.url}`,
        exception,
      );
    }

    const errorEnvelope = {
      success: false,
      statusCode,
      message,
      error,
      ...(details ? { details } : {}),
      ...(!this.configService.get('ENV.PROD', { infer: true }) && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    response.status(statusCode).json(errorEnvelope);
  }
}
