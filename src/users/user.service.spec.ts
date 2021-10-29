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
  findOneOrFail: jest.fn(),
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
  let jwtService: JwtService;

  // 이하의 테스트들을 진행하기 앞서 각각 실행되는 힘수
  // 유닛 테스트에서는 beforeEach(), E2E에서는 beforeAll()을 사용.
  // 유닛 테스트에서 beforeAll()을 사용하면 toHaveBeenCalledTimes이 it()마다 누적 됨.
  beforeEach(async () => {
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
    jwtService = module.get<JwtService>(JwtService);
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

    it('should fail on exceptiono', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(UserArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not create an account.',
      });
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: 'test@test.test',
      password: '1234',
    };

    it('should fail if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.login(loginArgs);
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({
        ok: false,
        error: 'User not found.',
      });
    });

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Wrong password.',
      });
    });

    it('should return a token if password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      mockJwtService.sign.mockReturnValue('test-token');
      const result = await service.login(loginArgs);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
      expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({
        ok: true,
        token: expect.any(String),
      });
    });
  });

  describe('findById', () => {
    const findByIdArgs = {
      id: 1,
    };
    it('should find an existing an user', async () => {
      usersRepository.findOneOrFail.mockResolvedValue(findByIdArgs);
      const result = await service.findById(1);
      expect(result).toEqual({ ok: true, user: findByIdArgs });
    });

    it('should fail if no user is found', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(1);
      expect(result).toEqual({ ok: false, error: 'User not found.' });
    });
  });

  describe('editProfile', () => {});

  describe('verifyEmail', () => {});
});
