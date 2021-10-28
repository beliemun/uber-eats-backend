import {
  ArgsType,
  Field,
  InputType,
  ObjectType,
  PartialType,
} from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { CreateRestaurantInput } from './create-restaurant.dto';

@InputType()
class UpdateRestaurantInputType extends PartialType(CreateRestaurantInput) {}

@InputType()
export class UpdateRestaurantInput {
  @Field((type) => Number)
  id: number;

  @Field((type) => UpdateRestaurantInputType)
  data: UpdateRestaurantInputType;
}

@ObjectType()
export class updateRestaurantOutput extends CoreOutput {}
