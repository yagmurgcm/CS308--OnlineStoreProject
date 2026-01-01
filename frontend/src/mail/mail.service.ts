import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP VERIFY FAILED:', error);
      } else {
        console.log('✅ SMTP VERIFY SUCCESS: Server is ready');
      }
    });
  }

  async sendMail(options: {
    to: string;
    from?: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    return this.transporter.sendMail({
      from: options.from ?? process.env.MAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendTestEmail(to: string) {
    return this.sendMail({
      to,
      subject: 'Test email from Online Store',
      text: 'If you see this email, the mail service works correctly.',
    });
  }
}
