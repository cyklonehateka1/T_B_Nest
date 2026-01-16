import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EmailTemplateService } from './email-template.service';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface BrevoEmailPayload {
  sender: {
    name: string;
    email: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: {
    email: string;
    name?: string;
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly emailFrom: string;
  private readonly emailFromName: string;
  private readonly frontendUrl: string;
  private readonly supportEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    // Load Brevo API config from environment
    const apiKey = this.configService.get<string>('BREVO_SMTP_API_KEY');
    const baseUrl = this.configService.get<string>(
      'BREVO_SMTP_BASE_URL',
      'https://api.brevo.com',
    );

    if (!apiKey) {
      throw new Error('BREVO_SMTP_API_KEY is required for Brevo API');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.emailFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'support@giftbanc.com',
    );
    this.emailFromName = this.configService.get<string>(
      'EMAIL_FROM_NAME',
      'GiftBanc',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://giftbanc.com',
    );
    this.supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'support@giftbanc.com',
    );
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const payload: BrevoEmailPayload = {
        sender: {
          name: this.emailFromName,
          email: options.from || this.emailFrom,
        },
        to: [
          {
            email: options.to,
            name: options.to.split('@')[0], // Use email prefix as name if no name provided
          },
        ],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
      };

      if (options.replyTo) {
        payload.replyTo = {
          email: options.replyTo,
          name: options.replyTo.split('@')[0],
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/v3/smtp/email`,
        payload,
        {
          headers: {
            accept: 'application/json',
            'api-key': this.apiKey,
            'content-type': 'application/json',
          },
        },
      );
    } catch (error) {
      this.logger.error('Brevo API: Error sending email', error);
      if (axios.isAxiosError(error)) {
        this.logger.error('API Response:', error.response?.data);
        this.logger.error('API Status:', error.response?.status);
      }
      throw error;
    }
  }

  // Example: Send Invite Email
  async sendInviteEmail(
    email: string,
    token: string,
    role: string,
    invitedBy: string,
  ): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/auth/register?token=${token}`;
    const html = await this.templateService.renderInviteTemplate({
      email,
      role,
      invitedBy,
      inviteUrl,
      expiryHours: 24,
      supportEmail: this.supportEmail,
    });
    await this.sendEmail({
      to: email,
      subject: `You're invited to join Gift Card Admin Platform`,
      html,
      from: this.emailFrom,
    });
  }

  // Example: Send Password Reset Email
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    const html = await this.templateService.renderPasswordResetTemplate({
      email,
      resetUrl,
      expiryHours: 1,
      supportEmail: this.supportEmail,
    });
    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - GiftBanc',
      html,
      from: this.emailFrom,
    });
  }

  // Example: Send OTP Email
  async sendOtpEmail(
    email: string,
    otp: string,
    firstName: string,
  ): Promise<void> {
    const html = await this.templateService.renderOtpTemplate({
      email,
      otp,
      firstName,
      expiryMinutes: 10,
      supportEmail: this.supportEmail,
    });
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Gift Card Shop',
      html,
      from: this.emailFrom,
    });
  }

  // Payment success email
  async sendPaymentSuccessEmail(
    email: string,
    data: {
      orderNumber: string;
      amount: number;
      paymentMethod: string;
      customerName: string;
    },
  ): Promise<void> {
    const subject = `Payment Successful - Order ${data.orderNumber}`;
    const html = this.templateService.generatePaymentSuccessEmail(data);
    await this.sendEmail({ to: email, subject, html });
  }

  // Payment failure email
  async sendPaymentFailureEmail(
    email: string,
    data: {
      orderNumber: string;
      amount: number;
      errorMessage?: string;
      customerName: string;
    },
  ): Promise<void> {
    const subject = `Payment Failed - Order ${data.orderNumber}`;
    const html = this.templateService.generatePaymentFailureEmail(data);
    await this.sendEmail({ to: email, subject, html });
  }

  // Admin notification for paid orders
  async sendOrderPaidNotification(
    email: string,
    data: {
      orderNumber: string;
      amount: number;
      customerName: string;
      customerEmail: string;
    },
  ): Promise<void> {
    const subject = `New Paid Order - ${data.orderNumber}`;
    const html = this.templateService.generateOrderPaidNotification(data);
    await this.sendEmail({ to: email, subject, html });
  }

  // Payment monitoring success notification
  async sendPaymentMonitoringSuccessEmail(
    email: string,
    data: {
      orderNumber: string;
      amount: number;
      paymentMethod: string;
      customerName: string;
      paymentId: string;
      processingTime?: string;
    },
  ): Promise<void> {
    const subject = `Payment Successfully Processed - Order ${data.orderNumber}`;
    const html =
      this.templateService.generatePaymentMonitoringSuccessEmail(data);
    await this.sendEmail({ to: email, subject, html });
  }

  // Payment monitoring failure notification
  async sendPaymentMonitoringFailureEmail(
    email: string,
    data: {
      orderNumber: string;
      amount: number;
      errorMessage?: string;
      customerName: string;
      paymentId: string;
      paymentMethod: string;
      retryUrl?: string;
    },
  ): Promise<void> {
    const html =
      this.templateService.generatePaymentMonitoringFailureEmail(data);
    await this.sendEmail({
      to: email,
      subject: `Payment Failed - Order ${data.orderNumber}`,
      html,
    });
  }

  async sendGiftDeliveryEmail(data: {
    recipientEmail: string;
    senderName: string;
    personalMessage?: string;
    productName: string;
    giftCardCodes: string[];
  }): Promise<void> {
    const html = this.templateService.generateGiftDeliveryEmail(data);
    await this.sendEmail({
      to: data.recipientEmail,
      subject: `🎁 You've received a gift card from ${data.senderName}!`,
      html,
    });
  }

  async sendPasswordChangeNotification(email: string): Promise<void> {
    const html = this.templateService.generatePasswordChangeNotification();
    await this.sendEmail({
      to: email,
      subject: '🔒 Password Changed Successfully',
      html,
    });
  }

  async sendAccountDeletionNotification(email: string): Promise<void> {
    const html = this.templateService.generateAccountDeletionNotification();
    await this.sendEmail({
      to: email,
      subject: '🗑️ Account Deleted Successfully',
      html,
    });
  }
}
