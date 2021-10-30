import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { Verification } from './entities/verification.entity';
import { VerifyEmailOutput } from './dtos/verify-email.dto';
import { UserProfileOutput } from './dtos/user-profile.tdo';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<CreateAccountOutput> {
    try {
      // check an exisiting user
      const existingUser = await this.users.findOne({ email });
      if (existingUser) {
        return {
          ok: false,
          error: 'There is an user with that email already.',
        };
      }
      // create an user with input arguments
      const user = await this.users.save(
        this.users.create({ email, password, role }),
      );
      // create a verification with this new user
      const verification = await this.verifications.save(
        this.verifications.create({
          user,
        }),
      );
      // send a verification email
      this.mailService.sendVerificationEmail(user.email, verification.code);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not create an account.' };
    }
  }

  async login({ email, password }: LoginInput): Promise<LoginOutput> {
    try {
      // find an user
      const user = await this.users.findOne(
        { email },
        { select: ['id', 'password'] },
      );
      if (!user) {
        return {
          ok: false,
          error: 'User not found.',
        };
      }
      // check password
      const checkPassword = await user.checkPassword(password);
      if (!checkPassword) {
        return {
          ok: false,
          error: 'Wrong password.',
        };
      }
      // verify a token
      const token = this.jwtService.sign(user.id);
      return {
        ok: true,
        token,
      };
    } catch (error) {
      return { ok: false, error: 'Can not log user in.' };
    }
  }

  async findById(id: number): Promise<UserProfileOutput> {
    try {
      const user = await this.users.findOneOrFail({ id });
      return { ok: true, user };
    } catch (error) {
      return { ok: false, error: 'User not found.' };
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      // find an user
      const user = await this.users.findOne(userId);
      if (!user) {
        return { ok: false, error: 'User not found.' };
      }
      // if email is changed, user.verified must change to false
      if (email) {
        user.email = email;
        user.verified = false;
        const verification = await this.verifications.save(
          this.verifications.create(user),
        );
        // send a verification email
        this.mailService.sendVerificationEmail(user.email, verification.code);
      }
      if (password) {
        user.password = password;
      }
      await this.users.save(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not update profile.' };
    }
  }

  async verifyEmail(code: string): Promise<VerifyEmailOutput> {
    try {
      // find a verification with the code, and user property must be expanded
      const verification = await this.verifications.findOne(
        { code },
        { relations: ['user'] },
      );
      if (verification) {
        verification.user.verified = true;
        await this.users.save(verification.user);
        await this.verifications.delete(verification.id);
        return { ok: true };
      }
      return { ok: false, error: 'Verification not found.' };
    } catch (error) {
      return { ok: false, error: 'Could not verify the email.' };
    }
  }
}
