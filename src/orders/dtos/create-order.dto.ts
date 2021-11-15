import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Order } from '../entites/order.entity';

@InputType()
export class CreateOrderInput extends PickType(Order, ['items']) {
  @Field(() => Number)
  restaurantId: number;
}

@ObjectType()
export class CreateOrderOutput extends CoreOutput {}
