import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

export interface EmailService {
  sendEmail(options: SendEmailOptions): Promise<boolean>;
  sendOtpEmail(to: string, code: string, purpose: string): Promise<boolean>;
}

// Dev cache of recent OTPs
export const devOtpStore = new Map<string, { code: string; sentAt: Date; purpose: string }>();

export class NodemailerEmailService implements EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private provider: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || (process.env.SMTP_USER || process.env.GMAIL_USER ? 'smtp' : 'console');

    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;

    if (smtpUser && smtpPass) {
      if (smtpHost) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465' || process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      } else {
        // Default to Gmail service if user/pass provided without custom host
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      }
      console.log(`[EmailService] Transporter initialized for ${smtpUser}`);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const from = process.env.SMTP_FROM || (smtpUser ? `FarmDirect <${smtpUser}>` : 'FarmDirect <noreply@farmdirect.market>');

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        console.log(`[EmailService] ✅ Real email sent to ${options.to}: ${options.subject}`);
        return true;
      } catch (err) {
        console.error('[EmailService] ❌ Failed to send SMTP email:', err);
      }
    }

    // Console / Development Fallback
    console.log('\n================== [FARMDIRECT EMAIL DISPATCH] ==================');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('-----------------------------------------------------------------');
    console.log(options.text || 'See HTML body');
    console.log('=================================================================\n');

    return true;
  }

  async sendOtpEmail(to: string, code: string, purpose: string): Promise<boolean> {
    devOtpStore.set(to.toLowerCase(), {
      code,
      sentAt: new Date(),
      purpose,
    });

    const actionText = purpose === 'signup' ? 'Complete Your Registration' : 'Sign In to Your Account';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4fbf7; margin: 0; padding: 20px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2f2e9; overflow: hidden; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08); }
          .header { background: #065f46; color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; }
          .content { padding: 32px 28px; text-align: center; color: #1f2937; }
          .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #111827; }
          .desc { font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px; }
          .otp-box { background: #ecfdf5; border: 2px dashed #059669; border-radius: 10px; padding: 18px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #047857; margin: 0 auto 24px auto; max-width: 260px; }
          .expiry-note { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
          .footer { background: #f9fafb; border-top: 1px solid #f3f4f6; padding: 18px 24px; text-align: center; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌱 FarmDirect</h1>
            <p>Direct Farmer-to-Buyer Marketplace & Hub Logistics</p>
          </div>
          <div class="content">
            <div class="title">${actionText}</div>
            <div class="desc">Please use the verification code below to verify your email address. This code is valid for <strong>5 minutes</strong>.</div>
            <div class="otp-box">${code}</div>
            <div class="expiry-note">If you did not request this verification code, please ignore this email.</div>
          </div>
          <div class="footer">
            FarmDirect Escrow & Hub Logistics Platform &copy; ${new Date().getFullYear()}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `🌱 Your FarmDirect Verification Code: ${code}`,
      text: `Your FarmDirect verification code is: ${code}. It expires in 5 minutes.`,
      html,
    });
  }
}

export const emailService = new NodemailerEmailService();
export default emailService;
