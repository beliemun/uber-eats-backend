import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { EmailVar, MailModuleOptions } from './mail.interface';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  private async sendEmail(
    subject: string,
    to: string,
    template: string,
    emailVars: EmailVar[],
  ) {
    const form = new FormData();
    form.append(
      'from',
      `Burngrit from User Eats <mailgun@${this.options.domain}>`,
    );
    form.append('to', to);
    form.append('subject', subject);
    form.append('template', template);
    emailVars.forEach((e) => form.append(`v:${e.key}`, e.value));

    try {
      await got(`https://api.mailgun.net/v3/${this.options.domain}/messages`, {
        headers: {
          // Buffer를 이용해서 base64 형식으로 변경하면 'XBpOjgxZWY1NzUzYj..' 형식으로 나옴
          // Header의 형태를 갖추기 위해 이렇게 만들어줘야 함
          Authorization: `Basic ${Buffer.from(
            `api:${this.options.apiKey}`,
          ).toString('base64')}`,
        },
        method: 'POST',
        body: form,
      });
    } catch (erorr) {
      console.log(erorr);
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail('Verify Your Email', 'burngrit@icloud.com', 'verify-email', [
      { key: 'username', value: email },
      { key: 'code', value: code },
    ]);
  }
}
