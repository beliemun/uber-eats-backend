import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';
import { Category } from '../entities/caterogy.entity';
import { Restaurant } from '../entities/restaurant.entity';

@InputType()
export class CategoryInput extends PaginationInput {
  @Field(() => String)
  slug: string;
}

@ObjectType()
export class CategoryOutput extends PaginationOutput {
  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field(() => [Restaurant], { nullable: true })
  restaurants?: Restaurant[];
}