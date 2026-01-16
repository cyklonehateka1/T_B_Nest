import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      message: message,
      success: false,
    };

    // Log the full exception to the console if it's a 500 error
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log stack if available, otherwise log the exception object
      if (exception instanceof Error && exception.stack) {
        console.error("Internal Server Error:", exception.stack);
      } else {
        console.error("Internal Server Error:", exception);
      }
    }

    response.status(status).json(errorResponse);
  }
}
