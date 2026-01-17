import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse as ApiResponseDto } from "../dto/api-response.dto";

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already an ApiResponseDto, return it as is
        if (data && typeof data === "object" && "success" in data) {
          return data;
        }

        // Transform the response to follow the standard structure
        return ApiResponseDto.success(data, "Success");
      }),
    );
  }
}
