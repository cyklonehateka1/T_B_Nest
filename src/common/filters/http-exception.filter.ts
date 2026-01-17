import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

/**
 * Global exception filter that catches all exceptions
 * For 500 errors, returns a safe generic message to prevent exposing internal errors
 * Full error details are logged server-side for debugging
 */
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

      // For non-500 errors, use the exception message (safe to expose)
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
        // For 500 errors, always return a safe generic message
        message = "An unexpected error occurred. Please try again later.";

        // Log the actual error details server-side
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
      // For non-HttpException errors (500 errors), return safe generic message
      message = "An unexpected error occurred. Please try again later.";

      // Log the actual error details server-side
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
