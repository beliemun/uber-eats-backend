import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import exp from 'constants';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersService } from './users.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockMailService = {
  sendVerificationEmail: jest.fn(),
};

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  // 생성한 테스트 모듈을 밖에서 사용할 수 있도록 beforeAll() 밖에 선언
  let service: UsersService;
  let usersRepository: MockRepository<User>;
  let verificationRepository: MockRepository<User>;
  let mailService: MailService;

  // 모든 테스트를 진행하기 앞서 실행되는 힘수
  beforeAll(async () => {
    // 테스트 모듈을 생성
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
    mailService = module.get<MailService>(MailService);
  });

  // 테스트 모듈 생성이 정상적인지 확인
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const UserArgs = {
      email: 'test@test.test',
      password: '1234',
      role: 0,
    };
    const VerificationArgs = {
      code: '1234',
      user: UserArgs,
    };

    it('should fail if user exists', async () => {
      // findOne()이 필요한 args에 상관없이 반환되는 유저를 임의 생성(현재 유저가 있다고 판단)
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: '',
      });
      const result = await service.createAccount(UserArgs);
      // 때문에 createAccount() 내 첫번째 유저가 존재하는지 확인하는 조건문에서 반드시 실패 하게 됨.
      expect(result).toMatchObject({
        ok: false,
        error: 'There is an user with that email already.',
      });
    });

    it('should create a new user', async () => {
      // 찾은 유저가 없어야 하고,
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(UserArgs);
      usersRepository.save.mockResolvedValue(UserArgs);
      verificationRepository.create.mockReturnValue(VerificationArgs);
      verificationRepository.save.mockResolvedValue(VerificationArgs);
      await service.createAccount(UserArgs);
      // createAccount 함수는 한번만 호출되어야 한다.
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(UserArgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(UserArgs);
      expect(verificationRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: UserArgs,
      });
      expect(verificationRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenCalledWith(
        VerificationArgs,
      );
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
    });
  });

  it.todo('findById');
  it.todo('login');
  it.todo('editProfile');
  it.todo('verifyEmail');
});
