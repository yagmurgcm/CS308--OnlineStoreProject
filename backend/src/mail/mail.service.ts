import { Injectable, OnModuleInit } from '@nestjs/common';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transport: Transporter | null = null;
  private selfTestRun = false;

  private mask(value: string | undefined | null) {
    if (!value) return '<undefined>';
    const [name, domain] = value.split('@');
    if (!domain) return `${value.slice(0, 2)}***`;
    return `${name.slice(0, 2)}***@${domain}`;
  }

  private normalizeEnvValue(value: string | undefined | null): string | undefined {
    if (value === undefined || value === null) return undefined;
    return value.replace(/['"\s]/g, '');
  }

  private createTransport(): Transporter | null {
    const user = this.normalizeEnvValue(process.env.MAIL_USER || process.env.SMTP_USER);
    const pass = this.normalizeEnvValue(process.env.MAIL_PASS || process.env.SMTP_PASS);

    console.log(
      '[MailService] Env check',
      JSON.stringify({
        cwd: process.cwd(),
        user: this.mask(user),
        hasPass: Boolean(pass),
      }),
    );

    if (!user || !pass) {
      console.warn(
        '[MailService] SMTP credentials are missing (set MAIL_USER/MAIL_PASS or SMTP_USER/SMTP_PASS).',
      );
      return null;
    }

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return transport;
  }

  private getTransport(): Transporter | null {
    if (!this.transport) {
      this.transport = this.createTransport();
      if (!this.transport) return null;
      this.verifyTransport(this.transport);
    }
    return this.transport;
  }

  private async verifyTransport(transport: Transporter) {
    try {
      const verified = await transport.verify();
      console.log('[MailService] Transport verification result:', verified);
    } catch (err) {
      console.error('[MailService] Transport verification failed', err);
    }
  }

  async sendMail(options: SendMailOptions): Promise<SentMessageInfo | null> {
    const transport = this.getTransport();
    if (!transport) {
      console.warn('[MailService] Transport not available; mail not sent.');
      return null;
    }

    try {
      console.log('MAIL SERVICE CALLED:', options.to);
      const info = await transport.sendMail(options);
      console.log(
        `[MailService] Mail sent to ${options.to}: ${info?.response ?? info?.messageId} | accepted=${JSON.stringify(
          info?.accepted,
        )} rejected=${JSON.stringify(info?.rejected)} envelope=${JSON.stringify(info?.envelope)}`,
      );
      return info;
    } catch (err) {
      console.error('[MailService] Failed to send mail', err);
      throw err;
    }
  }

  async sendTestEmail(to: string): Promise<SentMessageInfo | null> {
    console.log(`[MailService] Sending test email to ${to}`);
    return this.sendMail({
      to,
      from:
        process.env.MAIL_FROM ||
        process.env.SMTP_FROM ||
        process.env.MAIL_USER ||
        process.env.SMTP_USER,
      subject: 'Test email from MailService',
      text: 'This is a test email to verify SMTP configuration.',
    });
  }

  async sendSelfTest(): Promise<void> {
    const user = this.normalizeEnvValue(process.env.MAIL_USER || process.env.SMTP_USER);
    if (!user) {
      console.warn('[MailService] Self-test skipped: MAIL_USER not set.');
      return;
    }
    console.log(`[MailService] Running self-test email to ${this.mask(user)}`);
    try {
      const info = await this.sendTestEmail(user);
      console.log(
        `[MailService] Self-test result: ${info?.response ?? info?.messageId ?? 'no response'} accepted=${JSON.stringify(
          info?.accepted,
        )} rejected=${JSON.stringify(info?.rejected)}`,
      );
    } catch (err) {
      console.error('[MailService] Self-test failed', err);
    }
  }

  async onModuleInit() {
    if (this.selfTestRun) return;
    this.selfTestRun = true;
    const shouldRun =
      (process.env.MAIL_SELF_TEST || 'true').trim().toLowerCase() !== 'false';
    if (!shouldRun) {
      console.log('[MailService] Self-test disabled via MAIL_SELF_TEST=false');
      return;
    }
    await this.sendSelfTest();
  }
}
