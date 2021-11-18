import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, RelationId } from 'typeorm';

@InputType('PaymentInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Payment extends CoreEntity {
  @Field(() => String)
  @Column()
  transactionId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.payments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user?: User;

  @RelationId((payment: Payment) => payment.user)
  userId: number;

  @Field(() => Restaurant, { nullable: true })
  @ManyToOne(() => Restaurant)
  restaurant?: Restaurant;

  @Field(() => Number)
  @RelationId((payment: Payment) => payment.restaurant)
  restaurantId: number;
}
