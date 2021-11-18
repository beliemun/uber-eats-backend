import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, RelationId } from 'typeorm';

@InputType('PaymentInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Payment extends CoreEntity {
  @Field(() => Number)
  @Column()
  transactionId: number;

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
  restautant?: Restaurant;

  @RelationId((payment: Payment) => payment.restautant)
  restaurantId: number;
}
