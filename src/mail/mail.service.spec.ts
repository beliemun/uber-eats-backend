import got from 'got';
import * as FormData from 'form-data';
import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailService } from './mail.service';

jest.mock('got');
jest.mock('form-data');

const TEST_DOMAIN = 'test-domain';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'test-apiKey',
            domain: TEST_DOMAIN,
            fromEmail: 'test-fromEmail',
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be define', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', () => {
      const sendVerificationEmailArgs = {
        email: 'test-email',
        code: 'test-code',
      };
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => true);
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith(
        'Verify Your Email',
        'burngrit@icloud.com',
        'verify-email',
        [
          { key: 'username', value: sendVerificationEmailArgs.email },
          { key: 'code', value: sendVerificationEmailArgs.code },
        ],
      );
    });
  });

  describe('sendEmail', () => {
    it('sendEmail', async () => {
      const ok = await service.sendEmail('', '', '', [
        { key: 'testKey', value: 'testValue' },
      ]);
      // .prototype을 사용하는 이유는  mail.service에서 new FormData()의 new 키워드로 생성되었을때 'append'를 인식할 수 있기 떄문이다.
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      expect(formSpy).toHaveBeenCalledTimes(5);
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(ok).toEqual(true);
    });
    it('fails on error', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error();
      });
      const ok = await service.sendEmail('', '', '', [
        { key: 'testKey', value: 'testValue' },
      ]);
      expect(ok).toEqual(false);
    });
  });
});
