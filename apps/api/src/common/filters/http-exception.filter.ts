import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

function extractMessage(exception: HttpException): unknown {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'message' in body) {
    return (body as { message: unknown }).message ?? exception.message;
  }
  return exception.message;
}

/**
 * Respuesta de error uniforme en es-CL. Nunca se filtra el mensaje técnico
 * a clientes en producción: solo devuelve detalle de validación (422) o el
 * mensaje de la excepción HTTP. Los errores no controlados quedan en el log.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodError) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Error de validación',
        issues: exception.issues,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        statusCode: status,
        message: extractMessage(exception),
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.error('Error no controlado', exception as Error);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}