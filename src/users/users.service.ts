import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountInput } from './dtos/create-account.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}

  async createAccount({ email, password, role }: CreateAccountInput) {
    try {
      const exists = await this.repository.findOne({ email });
      if (exists) {
        //make error
        return 'There is an user with that email already.';
      }
      await this.repository.save(
        this.repository.create({ email, password, role }),
      );
    } catch (e) {
      //make error
      return 'Could not create an account.';
    }

    // create user & hash the password
  }
}
