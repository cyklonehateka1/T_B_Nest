import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "An unexpected error occurred. Please try again later.";
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (status !== HttpStatus.INTERNAL_SERVER_ERROR) {
        if (
          typeof exceptionResponse === "object" &&
          exceptionResponse !== null
        ) {
          message = (exceptionResponse as any).message || exception.message;
        } else {
          message = exception.message;
        }
      } else {
        message = "An unexpected error occurred. Please try again later.";
        if (exception instanceof Error && exception.stack) {
          this.logger.error(
            `Internal Server Error (500): ${exception.message}`,
            exception.stack,
          );
        } else {
          this.logger.error("Internal Server Error (500):", exception);
        }
      }
    } else {
      message = "An unexpected error occurred. Please try again later.";
      if (exception instanceof Error && exception.stack) {
        this.logger.error(
          `Internal Server Error (500): ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.error("Internal Server Error (500):", exception);
      }
    }
    const errorResponse = {
      statusCode: status,
      message: message,
      success: false,
    };
    response.status(status).json(errorResponse);
  }
}
