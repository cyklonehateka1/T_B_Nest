import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';

export interface InviteTemplateData {
  email: string;
  role: string;
  invitedBy: string;
  inviteUrl: string;
  expiryHours: number;
  supportEmail: string;
}

export interface PasswordResetTemplateData {
  email: string;
  resetUrl: string;
  expiryHours: number;
  supportEmail: string;
}

export interface OtpTemplateData {
  email: string;
  otp: string;
  firstName: string;
  expiryMinutes: number;
  supportEmail: string;
}

@Injectable()
export class EmailTemplateService {
  private readonly inviteTemplate: HandlebarsTemplateDelegate<InviteTemplateData>;
  private readonly passwordResetTemplate: HandlebarsTemplateDelegate<PasswordResetTemplateData>;
  private readonly otpTemplate: HandlebarsTemplateDelegate<OtpTemplateData>;

  constructor() {
    this.inviteTemplate = Handlebars.compile(this.getInviteTemplate());
    this.passwordResetTemplate = Handlebars.compile(
      this.getPasswordResetTemplate(),
    );
    this.otpTemplate = Handlebars.compile(this.getOtpTemplate());
  }

  async renderInviteTemplate(data: InviteTemplateData): Promise<string> {
    return this.inviteTemplate(data);
  }

  async renderPasswordResetTemplate(
    data: PasswordResetTemplateData,
  ): Promise<string> {
    return this.passwordResetTemplate(data);
  }

  async renderOtpTemplate(data: OtpTemplateData): Promise<string> {
    return this.otpTemplate(data);
  }

  // Payment success email template
  generatePaymentSuccessEmail(data: {
    orderNumber: string;
    amount: number;
    paymentMethod: string;
    customerName: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - Order ${data.orderNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .order-details {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1>Payment Successful!</h1>
            <p>Your order has been paid for successfully</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.customerName},</p>
            
            <p>Great news! Your payment has been processed successfully. Here are your order details:</p>
            
            <div class="order-details">
                <div class="detail-row">
                    <span><strong>Order Number:</strong></span>
                    <span>${data.orderNumber}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Amount Paid:</strong></span>
                    <span>GHS ${data.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Payment Method:</strong></span>
                    <span>${data.paymentMethod}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Status:</strong></span>
                    <span style="color: #10b981; font-weight: 600;">Paid</span>
                </div>
            </div>
            
            <p>Our team will process your order and send you the gift card codes shortly. You'll receive another email with your gift card details.</p>
            
            <p>Thank you for choosing our service!</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from GiftBanc</p>
            <p>If you have any questions, please contact our support team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Payment failure email template
  generatePaymentFailureEmail(data: {
    orderNumber: string;
    amount: number;
    errorMessage?: string;
    customerName: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed - Order ${data.orderNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .order-details {
            background-color: #fef2f2;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #ef4444;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #fecaca;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="error-icon">❌</div>
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.customerName},</p>
            
            <p>Unfortunately, your payment for order ${data.orderNumber} could not be processed. Here are the details:</p>
            
            <div class="order-details">
                <div class="detail-row">
                    <span><strong>Order Number:</strong></span>
                    <span>${data.orderNumber}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Amount:</strong></span>
                    <span>GHS ${data.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Status:</strong></span>
                    <span style="color: #ef4444; font-weight: 600;">Failed</span>
                </div>
                ${
                  data.errorMessage
                    ? `
                <div class="detail-row">
                    <span><strong>Error:</strong></span>
                    <span>${data.errorMessage}</span>
                </div>
                `
                    : ''
                }
            </div>
            
            <p>You can try again by visiting your order page and attempting the payment again. If the problem persists, please contact our support team.</p>
            
            <a href="#" class="cta-button">Try Payment Again</a>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Gift Card Shop</p>
            <p>If you have any questions, please contact our support team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Admin notification for paid orders
  generateOrderPaidNotification(data: {
    orderNumber: string;
    amount: number;
    customerName: string;
    customerEmail: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Paid Order - ${data.orderNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .notification-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .order-details {
            background-color: #eff6ff;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #3b82f6;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #dbeafe;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="notification-icon">💰</div>
            <h1>New Paid Order</h1>
            <p>Order ${data.orderNumber} has been paid for</p>
        </div>
        
        <div class="content">
            <p>A new order has been paid for and is ready for fulfillment:</p>
            
            <div class="order-details">
                <div class="detail-row">
                    <span><strong>Order Number:</strong></span>
                    <span>${data.orderNumber}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Customer:</strong></span>
                    <span>${data.customerName}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Customer Email:</strong></span>
                    <span>${data.customerEmail}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Amount:</strong></span>
                    <span>GHS ${data.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Status:</strong></span>
                    <span style="color: #10b981; font-weight: 600;">Paid</span>
                </div>
            </div>
            
            <p>Please process this order and send the gift card codes to the customer.</p>
            
            <a href="#" class="cta-button">View Order Details</a>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from Gift Card Shop</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Payment monitoring success email template
  generatePaymentMonitoringSuccessEmail(data: {
    orderNumber: string;
    amount: number;
    paymentMethod: string;
    customerName: string;
    paymentId: string;
    processingTime?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successfully Processed - Order ${data.orderNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .order-details {
            background-color: #f0fdf4;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #10b981;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #bbf7d0;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .processing-info {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
            border-left: 4px solid #3b82f6;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1>Payment Successfully Processed!</h1>
            <p>Your payment has been confirmed and processed</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.customerName},</p>
            
            <p>Great news! Your payment has been successfully processed and confirmed by our payment monitoring system. Here are the details:</p>
            
            <div class="order-details">
                <div class="detail-row">
                    <span><strong>Order Number:</strong></span>
                    <span>${data.orderNumber}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Payment ID:</strong></span>
                    <span>${data.paymentId}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Amount Paid:</strong></span>
                    <span>GHS ${data.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Payment Method:</strong></span>
                    <span>${data.paymentMethod}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Status:</strong></span>
                    <span style="color: #10b981; font-weight: 600;">Confirmed & Processed</span>
                </div>
            </div>
            
            <div class="processing-info">
                <h3 style="margin-top: 0; color: #1e40af;">🔄 Processing Information</h3>
                <p><strong>Payment Verification:</strong> Our automated system has successfully verified your payment with the payment provider.</p>
                ${data.processingTime ? `<p><strong>Processing Time:</strong> ${data.processingTime}</p>` : ''}
                <p><strong>Next Steps:</strong> Your order is now being prepared for fulfillment. You'll receive your gift card codes shortly.</p>
            </div>
            
            <p>Thank you for your patience and for choosing our service!</p>
        </div>
        
        <div class="footer">
            <p>This is an automated confirmation from Gift Card Shop</p>
            <p>If you have any questions, please contact our support team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Payment monitoring failure email template
  generatePaymentMonitoringFailureEmail(data: {
    orderNumber: string;
    amount: number;
    errorMessage?: string;
    customerName: string;
    paymentId: string;
    paymentMethod: string;
    retryUrl?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .order-details {
            background-color: #fef2f2;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #ef4444;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #fecaca;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="error-icon">❌</div>
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.customerName},</p>
            
            <p>Unfortunately, your payment for order ${data.orderNumber} could not be processed. Here are the details:</p>
            
            <div class="order-details">
                <div class="detail-row">
                    <span><strong>Order Number:</strong></span>
                    <span>${data.orderNumber}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Payment ID:</strong></span>
                    <span>${data.paymentId}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Amount:</strong></span>
                    <span>GHS ${data.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Payment Method:</strong></span>
                    <span>${data.paymentMethod}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Status:</strong></span>
                    <span style="color: #ef4444; font-weight: 600;">Processing Failed</span>
                </div>
            </div>
            
            ${
              data.errorMessage
                ? `
            <div class="error-details">
                <h3 style="margin-top: 0; color: #92400e;">⚠️ Error Details</h3>
                <p><strong>Error Message:</strong> ${data.errorMessage}</p>
                <p>This could be due to a temporary issue with the payment provider or network connectivity.</p>
            </div>
            `
                : ''
            }
            
            <p>You can try again by visiting your order page and attempting the payment again. If the problem persists, please contact our support team.</p>
            
            ${data.retryUrl ? `<a href="${data.retryUrl}" class="cta-button">Try Payment Again</a>` : ''}
        </div>
        
        <div class="footer">
            <p>This is an automated message from Gift Card Shop</p>
            <p>If you have any questions, please contact our support team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generatePasswordChangeNotification(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .alert-box {
            background-color: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .alert-box h3 {
            color: #1d4ed8;
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .alert-box p {
            margin: 0;
            color: #1e40af;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-box h3 {
            color: #475569;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .info-box ul {
            margin: 0;
            padding-left: 20px;
            color: #64748b;
        }
        .info-box li {
            margin: 5px 0;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 0;
        }
        .button:hover {
            background-color: #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Password Changed Successfully</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>Your password has been successfully changed. This is a security notification to confirm that the password change was completed.</p>
            
            <div class="alert-box">
                <h3>⚠️ Security Alert</h3>
                <p>If you did not initiate this password change, please contact our support team immediately and consider changing your password again.</p>
            </div>
            
            <div class="info-box">
                <h3>🔐 Security Tips</h3>
                <ul>
                    <li>Use a strong, unique password for your account</li>
                    <li>Never share your password with anyone</li>
                    <li>Enable two-factor authentication if available</li>
                    <li>Regularly review your account activity</li>
                    <li>Log out from devices you don't recognize</li>
                </ul>
            </div>
            
            <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The Gift Card Shop Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated security notification. Please do not reply to this email.</p>
            <p>If you need assistance, contact our support team.</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateAccountDeletionNotification(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deleted Successfully</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .alert-box {
            background-color: #fef2f2;
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .alert-box h3 {
            color: #dc2626;
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .alert-box p {
            margin: 0;
            color: #b91c1c;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-box h3 {
            color: #475569;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .info-box ul {
            margin: 0;
            padding-left: 20px;
            color: #64748b;
        }
        .info-box li {
            margin: 5px 0;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗑️ Account Deleted Successfully</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>Your account has been successfully deleted as requested. This is a confirmation email to notify you that the account deletion process has been completed.</p>
            
            <div class="alert-box">
                <h3>⚠️ Important Notice</h3>
                <p>This action is irreversible. Your account and all associated data have been permanently removed from our system.</p>
            </div>
            
            <div class="info-box">
                <h3>📋 What Happens Next</h3>
                <ul>
                    <li>Your account is no longer accessible</li>
                    <li>All personal data has been removed</li>
                    <li>You will no longer receive emails from us</li>
                    <li>If you had any active orders, they may be affected</li>
                    <li>You can create a new account anytime if needed</li>
                </ul>
            </div>
            
            <p>If you did not request this account deletion or have any questions, please contact our support team immediately.</p>
            
            <p>Thank you for using our service.</p>
            
            <p>Best regards,<br>The Gift Card Shop Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>If you need assistance, contact our support team.</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateGiftDeliveryEmail(data: {
    recipientEmail: string;
    senderName: string;
    personalMessage?: string;
    productName: string;
    giftCardCodes: string[];
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You've Received a Gift Card!</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .gift-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .gift-details {
            background-color: #f0fdf4;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #10b981;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #bbf7d0;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .gift-codes {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border: 2px dashed #d1d5db;
        }
        .gift-code {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            color: #059669;
        }
        .personal-message {
            background-color: #fef3c7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
            font-style: italic;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="gift-icon">🎁</div>
            <h1>You've Received a Gift Card!</h1>
            <p>Someone special has sent you a gift</p>
        </div>
        
        <div class="content">
            <p>Hello!</p>
            
            <p>You've received a gift card from <strong>${data.senderName}</strong>!</p>
            
            <div class="gift-details">
                <div class="detail-row">
                    <span><strong>Gift Card:</strong></span>
                    <span>${data.productName}</span>
                </div>
                <div class="detail-row">
                    <span><strong>From:</strong></span>
                    <span>${data.senderName}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Status:</strong></span>
                    <span style="color: #10b981; font-weight: 600;">Delivered</span>
                </div>
            </div>
            
            ${
              data.personalMessage
                ? `
            <div class="personal-message">
                <p><strong>Personal Message:</strong></p>
                <p>"${data.personalMessage}"</p>
            </div>
            `
                : ''
            }
            
            <h3>Your Gift Card Codes:</h3>
            <div class="gift-codes">
                ${data.giftCardCodes
                  .map(
                    (code) => `
                <div class="gift-code">${code}</div>
                `,
                  )
                  .join('')}
            </div>
            
            <p><strong>How to use your gift card:</strong></p>
            <ul>
                <li>Copy the gift card code(s) above</li>
                <li>Visit the merchant's website or app</li>
                <li>Enter the code during checkout</li>
                <li>Enjoy your gift!</li>
            </ul>
            
            <p>Thank you for using our gift card service!</p>
        </div>
        
        <div class="footer">
            <p>This gift was sent via our secure gift card delivery system.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getInviteTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited - Gift Card Admin Platform</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #e2e8f0;
            font-size: 16px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-text {
            font-size: 18px;
            color: #374151;
            margin-bottom: 24px;
        }
        
        .invite-details {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #667eea;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #6b7280;
        }
        
        .detail-value {
            color: #374151;
            font-weight: 500;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 24px 0;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        
        .expiry-notice {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
            color: #92400e;
        }
        
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>Join the Gift Card Admin Platform</p>
        </div>
        
        <div class="content">
            <p class="welcome-text">
                Hello! You've been invited to join our Gift Card Admin Platform as a team member.
            </p>
            
            <div class="invite-details">
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">{{email}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">{{role}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invited by:</span>
                    <span class="detail-value">{{invitedBy}}</span>
                </div>
            </div>
            
            <p style="margin: 24px 0; color: #374151;">
                Click the button below to accept your invitation and set up your account:
            </p>
            
            <a href="{{inviteUrl}}" class="cta-button">
                Accept Invitation
            </a>
            
            <div class="expiry-notice">
                <strong>⏰ Important:</strong> This invitation will expire in {{expiryHours}} hours. 
                Please accept it before then to avoid having to request a new invitation.
            </div>
            
            <p style="margin: 24px 0; color: #6b7280; font-size: 14px;">
                If the button doesn't work, you can copy and paste this link into your browser:
                <br>
                <a href="{{inviteUrl}}" style="color: #667eea; word-break: break-all;">{{inviteUrl}}</a>
            </p>
        </div>
        
        <div class="footer">
            <p>This invitation was sent from the Gift Card Admin Platform</p>
            <p>If you didn't expect this invitation, please ignore this email</p>
            <p>
                Need help? Contact us at 
                <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private getPasswordResetTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Gift Card Admin Platform</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #fecaca;
            font-size: 16px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-text {
            font-size: 18px;
            color: #374151;
            margin-bottom: 24px;
        }
        
        .reset-info {
            background-color: #fef2f2;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #ef4444;
        }
        
        .info-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .info-item:last-child {
            margin-bottom: 0;
        }
        
        .info-icon {
            width: 20px;
            height: 20px;
            background-color: #ef4444;
            border-radius: 50%;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        .info-text {
            color: #374151;
            font-weight: 500;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 24px 0;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
        }
        
        .expiry-notice {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
            color: #92400e;
        }
        
        .security-notice {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
            color: #0c4a6e;
        }
        
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer a {
            color: #ef4444;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Reset Your Password</h1>
            <p>Gift Card Admin Platform</p>
        </div>
        
        <div class="content">
            <p class="welcome-text">
                Hello! We received a request to reset your password for your Gift Card Admin Platform account.
            </p>
            
            <div class="reset-info">
                <div class="info-item">
                    <div class="info-icon">✓</div>
                    <span class="info-text">Account: {{email}}</span>
                </div>
                <div class="info-item">
                    <div class="info-icon">⏰</div>
                    <span class="info-text">Requested: {{formatDate}}</span>
                </div>
                <div class="info-item">
                    <div class="info-icon">🔒</div>
                    <span class="info-text">Secure reset link</span>
                </div>
            </div>
            
            <p style="margin: 24px 0; color: #374151;">
                Click the button below to reset your password:
            </p>
            
            <a href="{{resetUrl}}" class="cta-button">
                Reset Password
            </a>
            
            <div class="expiry-notice">
                <strong>⏰ Important:</strong> This reset link will expire in {{expiryHours}} hour(s). 
                Please reset your password before then.
            </div>
            
            <div class="security-notice">
                <strong>🔒 Security Notice:</strong> If you didn't request this password reset, 
                please ignore this email. Your password will remain unchanged.
            </div>
            
            <p style="margin: 24px 0; color: #6b7280; font-size: 14px;">
                If the button doesn't work, you can copy and paste this link into your browser:
                <br>
                <a href="{{resetUrl}}" style="color: #ef4444; word-break: break-all;">{{resetUrl}}</a>
            </p>
        </div>
        
        <div class="footer">
            <p>This password reset was requested from the Gift Card Admin Platform</p>
            <p>If you didn't request this reset, please ignore this email</p>
            <p>
                Need help? Contact us at 
                <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private getOtpTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body {
            background: #f6f6f6;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: #222;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 420px;
            margin: 40px auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            padding: 32px 24px 24px 24px;
        }
        .logo {
            text-align: center;
            margin-bottom: 24px;
        }
        .logo img {
            height: 32px;
        }
        .title {
            font-size: 1.25rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 8px;
            color: #18181b;
        }
        .subtitle {
            font-size: 1rem;
            color: #52525b;
            text-align: center;
            margin-bottom: 24px;
        }
        .otp-box {
            background: #f4f4f5;
            border-radius: 8px;
            padding: 18px 0;
            text-align: center;
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: 0.4em;
            color: #18181b;
            margin-bottom: 20px;
        }
        .info {
            font-size: 0.95rem;
            color: #71717a;
            text-align: center;
            margin-bottom: 18px;
        }
        .footer {
            text-align: center;
            font-size: 0.85rem;
            color: #a1a1aa;
            margin-top: 32px;
        }
        .support-link {
            color: #2563eb;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <!-- You can replace this with your actual logo -->
            <img src="https://dummyimage.com/120x32/000/fff&text=Gift+Card+Shop" alt="Gift Card Shop" />
        </div>
        <div class="title">Verify your email</div>
        <div class="subtitle">Enter the code below to complete your registration.</div>
        <div class="otp-box">{{otp}}</div>
        <div class="info">This code will expire in {{expiryMinutes}} minutes.<br />If you did not request this, you can safely ignore this email.</div>
        <div class="footer">
            Sent from <b>Gift Card Shop</b>.<br />
            Need help? <a class="support-link" href="mailto:{{supportEmail}}">Contact support</a>
        </div>
    </div>
</body>
</html>
    `;
  }
}
