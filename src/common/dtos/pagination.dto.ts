import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { number } from 'joi';
import { CoreOutput } from './output.dto';

@InputType()
export class PaginationInput {
  @Field(() => Number, { defaultValue: 1 })
  page: number;
}

@ObjectType()
export class PaginationOutput extends CoreOutput {
  @Field(() => Number, { nullable: true })
  totalPages?: number;

  @Field(() => Number, { nullable: true })
  totalResults?: number;
}
