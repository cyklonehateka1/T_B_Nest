import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from '../services/webhook.service';
import { ApiResponse as ApiResponseDto } from '../dto/api-response.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive order notification webhook from admin app',
  })
  @ApiResponse({
    status: 200,
    description: 'Order notification webhook received successfully',
  })
  async handleOrderNotification(
    @Body() webhookData: any,
    @Headers() headers: Record<string, string>,
  ): Promise<ApiResponseDto<{ status: string; message: string }>> {
    try {
      this.logger.log(
        `Received order notification webhook: ${JSON.stringify(webhookData)}`,
      );

      // Validate webhook signature
      const signature = headers['x-webhook-signature'];
      const timestamp = headers['x-webhook-timestamp'];

      if (!signature || !timestamp) {
        this.logger.warn('Missing webhook signature or timestamp');
        throw new UnauthorizedException(
          'Missing webhook signature or timestamp',
        );
      }

      // Validate timestamp (within 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(timestamp, 10);
      const timeDiff = Math.abs(currentTime - webhookTime);

      if (timeDiff > 300) {
        // 5 minutes
        this.logger.warn('Webhook timestamp too old');
        throw new UnauthorizedException('Webhook timestamp too old');
      }

      // Validate signature
      const payloadString = JSON.stringify(webhookData);
      const webhookId = headers['x-webhook-id'];
      const expectedSignature = this.webhookService['generateSignature'](
        webhookId,
        timestamp,
        payloadString,
        this.webhookService['webhookSecret'],
      );

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Process the webhook data
      this.logger.log(
        `Processing order notification webhook for order: ${webhookData.orderId}`,
      );

      // Here you can add logic to process the order notification
      // For example, update local order status, send notifications, etc.

      this.logger.log(
        `Successfully processed order notification webhook for order: ${webhookData.orderId}`,
      );

      return ApiResponseDto.success(
        {
          status: 'success',
          message: 'Order notification processed successfully',
        },
        'Order notification webhook received successfully',
      );
    } catch (error) {
      this.logger.error(
        `Order notification webhook processing failed: ${error.message}`,
      );

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        return ApiResponseDto.error(error.message, HttpStatus.BAD_REQUEST);
      }

      return ApiResponseDto.error(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint for webhook connectivity' })
  @ApiResponse({
    status: 200,
    description: 'Webhook health check successful',
  })
  async healthCheck(): Promise<
    ApiResponseDto<{ status: string; timestamp: string }>
  > {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    this.logger.log('Webhook health check requested');

    return ApiResponseDto.success(
      healthData,
      'Webhook health check successful',
    );
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook received successfully',
  })
  async testWebhook(
    @Body() testData: any,
  ): Promise<
    ApiResponseDto<{ status: string; message: string; receivedData: any }>
  > {
    this.logger.log(`Test webhook received: ${JSON.stringify(testData)}`);

    return ApiResponseDto.success(
      {
        status: 'success',
        message: 'Test webhook received successfully',
        receivedData: testData,
      },
      'Test webhook processed successfully',
    );
  }
}
