import { Args, Mutation, Resolver, Query, Subscription } from '@nestjs/graphql';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { Role } from 'src/auth/role.decorator';
import { User } from 'src/users/entities/user.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { Order } from './entites/order.entity';
import { OrdersService } from './orders.service';
import { PubSub } from 'graphql-subscriptions';
import { Inject } from '@nestjs/common';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { OrderUpdatesInput } from './dtos/order-updates.dto';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';

@Resolver(() => Order)
export class OrderResolver {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => CreateOrderOutput)
  @Role('Client')
  createOrder(
    @AuthUser() customer: User,
    @Args('input') createOrderInput: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    return this.ordersService.createOrder(customer, createOrderInput);
  }

  @Query(() => GetOrdersOutput)
  @Role('Any')
  getOrders(
    @AuthUser() user: User,
    @Args('input') getOrdersInput: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    return this.ordersService.getOrders(user, getOrdersInput);
  }

  @Query(() => GetOrderOutput)
  @Role('Any')
  getOrder(
    @AuthUser() user: User,
    @Args('input') getOrderInput: GetOrderInput,
  ): Promise<GetOrderOutput> {
    return this.ordersService.getOrder(user, getOrderInput);
  }

  @Mutation(() => EditOrderOutput)
  @Role('Any')
  editOrder(
    @AuthUser() user: User,
    @Args('input') editOrderInput: EditOrderInput,
  ): Promise<EditOrderOutput> {
    return this.ordersService.editOrder(user, editOrderInput);
  }

  @Subscription(() => Order, {
    // filter는 반드시 true/false를 리턴해야 한다.
    filter: (payload, variables, context) => {
      // payload.pendingOrder.ownerId: 주문한 레스토랑의 소유자
      // context.user.id: 현재 로그인된 유저
      if (payload.pendingOrder.ownerId === context.user.id) {
        return true;
      }
    },
    resolve: (payload) => payload.pendingOrder.order,
  })
  @Role('Owner')
  pendingOrder() {
    return this.pubSub.asyncIterator(NEW_PENDING_ORDER);
  }

  @Subscription(() => Order)
  @Role('Delivery')
  cookedOrder() {
    return this.pubSub.asyncIterator(NEW_COOKED_ORDER);
  }

  @Subscription(() => Order, {
    filter: (
      { orderUpdates: order }: { orderUpdates: Order },
      { input }: { input: OrderUpdatesInput },
      { user }: { user: User },
    ) => {
      if (
        order.id !== user.id &&
        order.restaurant.ownerId !== user.id &&
        order.customerId !== user.id &&
        order.driverId !== user.id
      ) {
        return false;
      }
      return order.id === input.id;
    },
  })
  @Role('Any')
  orderUpdates(@Args('input') orderUpdatesInput: OrderUpdatesInput) {
    // orderUpdates에만 input이 있는 이유는 원하는 주문의 변경만 볼 수 있게 하기 위함.
    return this.pubSub.asyncIterator(NEW_ORDER_UPDATE);
  }

  @Mutation(() => TakeOrderOutput)
  @Role('Delivery')
  takeOrder(
    @AuthUser() user: User,
    @Args('input') takeOrderInput: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    return this.ordersService.takeOrder(user, takeOrderInput);
  }
}
