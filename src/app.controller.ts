import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as NestApiResponse,
} from "@nestjs/swagger";
import { ApiResponse } from "./common/dto/api-response.dto";
@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @ApiOperation({ summary: "Get application status" })
  @NestApiResponse({
    status: 200,
    description: "Application is running",
    schema: {
      example: {
        success: true,
        data: "Hello World!",
        message: "Application is running",
      },
    },
  })
  getHello(): ApiResponse<string> {
    const message = this.appService.getHello();
    return ApiResponse.success(message, "Application is running");
  }
}
