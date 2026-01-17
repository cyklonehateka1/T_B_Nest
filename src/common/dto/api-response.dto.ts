import { ApiProperty } from "@nestjs/swagger";

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface IPaginatedData<T> {
  total: number;
  data: T[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse<T> implements IApiResponse<T> {
  @ApiProperty({ description: "Indicates if the request was successful" })
  success: boolean;

  @ApiProperty({ description: "The actual response data" })
  data?: T;

  @ApiProperty({ description: "Response message" })
  message?: string;

  @ApiProperty({ description: "Response error" })
  error?: string;

  @ApiProperty({ description: "Response status code" })
  statusCode?: number;

  constructor(
    success: boolean,
    data?: T,
    message?: string,
    error?: string,
    statusCode?: number,
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.statusCode = statusCode;
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse(true, data, message);
  }

  static error<T>(error: string, statusCode?: number): ApiResponse<T> {
    return new ApiResponse<T>(false, undefined, undefined, error, statusCode);
  }
}
