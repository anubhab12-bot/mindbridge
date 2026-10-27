import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service.js';
import { JobsService } from '../queues/jobs.service.js';
import { renderTemplate, type MailTemplate, type TemplateData } from './templates.js';

export interface SentMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const SEND_MAIL_JOB = 'mail.send';

/**
 * Sends transactional email through SMTP (Mailpit in development). Emails never contain
 * clinical or conversation content: only notices with links back to the authenticated app.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  /** Populated only when MAIL_TRANSPORT=memory (tests). */
  readonly outbox: SentMail[] = [];

  constructor(
    private readonly config: AppConfigService,
    private readonly jobs: JobsService,
  ) {}

  onModuleInit() {
    if (this.config.get('MAIL_TRANSPORT') === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.get('SMTP_HOST'),
        port: this.config.get('SMTP_PORT'),
        secure: this.config.get('SMTP_SECURE'),
        auth: this.config.get('SMTP_USER')
          ? { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASSWORD') }
          : undefined,
      });
    }
    this.jobs.register(SEND_MAIL_JOB, async (data) => {
      await this.deliver(data['to'] as string, data['template'] as MailTemplate, data['data'] as TemplateData);
    });
  }

  /** Queues an email (or sends inline when queues are disabled). */
  async send(to: string, template: MailTemplate, data: TemplateData): Promise<void> {
    await this.jobs.dispatch(SEND_MAIL_JOB, { to, template, data });
  }

  private async deliver(to: string, template: MailTemplate, data: TemplateData) {
    const rendered = renderTemplate(template, { ...data, appUrl: this.config.get('WEB_APP_URL') });
    if (!this.transporter) {
      this.outbox.push({ to, ...rendered });
      return;
    }
    await this.transporter.sendMail({ from: this.config.get('MAIL_FROM'), to, ...rendered });
    this.logger.log({ msg: 'email sent', template });
  }
}
