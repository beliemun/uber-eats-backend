import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { CreateAccountInput } from './dtos/create-account.dto';
import { LoginInput } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/jwt/jwt.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<{ ok: boolean; error?: string }> {
    try {
      const user = await this.repository.findOne({ email });
      if (user) {
        return {
          ok: false,
          error: 'There is an user with that email already.',
        };
      }
      await this.repository.save(
        this.repository.create({ email, password, role }),
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not create an account.' };
    }
  }

  async login({
    email,
    password,
  }: LoginInput): Promise<{ ok: boolean; error?: string; token?: string }> {
    try {
      const user = await this.repository.findOne({ email });
      if (!user) {
        return {
          ok: false,
          error: 'User not found.',
        };
      }
      const isCorrect = await user.checkPassword(password);
      if (!isCorrect) {
        return {
          ok: false,
          error: 'Wrong password.',
        };
      }
      const token = this.jwtService.sign(user.id);
      return {
        ok: true,
        token,
      };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async findById(id: number): Promise<User> {
    return this.repository.findOne({ id });
  }
}
