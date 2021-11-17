import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from 'src/jwt/jwt.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { AllowedRoles } from './role.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly relfector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.relfector.get<AllowedRoles>(
      'roles',
      context.getHandler(),
    );
    // roles가 없다는 것은 Metadata가 설정되지 않았다는 것 => @Roles()
    if (!roles) {
      return true;
    }
    // Metadata가 설정되어 있다는 것은 (로그인된)User를 요구한다는 것
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const token = gqlContext.token;
    if (token) {
      const decoded = this.jwtService.verify(token.toString());
      if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
        const { user } = await this.usersService.findById(decoded['id']);
        gqlContext['user'] = user;
        // user가 Any이거나 요구되는 Roles와 같다면 true, 그게 아니면 false
        return user
          ? roles.includes('Any') || roles.includes(user.role)
          : false;
      }
    } else {
      return false;
    }
  }
}
