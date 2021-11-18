import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { identity } from 'rxjs';
import { Role } from 'src/auth/role.decorator';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput } from './dtos/create-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';
import { OrderItem } from './entites/order-item.entity';
import { Order, OrderStatus } from './entites/order.entity';

@Injectable()
@Role('Client')
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    @Inject(PUB_SUB)
    private readonly pubSub: PubSub,
  ) {}

  async createOrder(customer: User, { restaurantId, items }: CreateOrderInput) {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found.',
        };
      }
      // forEach 안에서는 return을 할 수 없어서 for of을 사용함.
      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        // 주문 받은 음식 찾기
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return {
            ok: false,
            error: 'Dish not found.',
          };
        }
        let dishFinalPrice = dish.price;
        // 옵션 가격 계산
        for (const itemOption of item.options) {
          const dishOption = dish.options.find(
            (dishOption) => dishOption.name === itemOption.name,
          );
          // 추가 옵션이 있다면
          if (dishOption) {
            // 옵션 자체에 가격이 있다면
            if (dishOption.extra) {
              dishFinalPrice += dishOption.extra;
            } else {
              // 옵션 자체에 가격이 없다면 세부 옵션 가격을 찾는다.
              const dishOptionChoice = dishOption.choices.find(
                (choice) => choice.name === itemOption.choice,
              );
              if (dishOptionChoice) {
                // 세부 옵션의 가격이 있다면
                if (dishOptionChoice.extra) {
                  dishFinalPrice += dishOptionChoice.extra;
                }
              }
            }
          }
        }
        // 주문 가격 합산
        orderFinalPrice += dishFinalPrice;

        const orderItem = await this.orderItems.save(
          this.orderItems.create({
            dish,
            options: item.options,
          }),
        );
        orderItems.push(orderItem);
      }

      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
        }),
      );
      // 주문이 들어갔다고 실시간으로 알림
      await this.pubSub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not create an order.',
      };
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[] = [];
      switch (user.role) {
        case UserRole.Client:
          orders = await this.orders.find({
            where: {
              customer: user,
              ...(status && { status }),
            },
          });
          break;
        case UserRole.Delivery:
          orders = await this.orders.find({
            where: {
              driver: user,
              ...(status && { status }),
            },
          });
          break;
        case UserRole.Owner:
          const restaurants = await this.restaurants.find({
            where: {
              owner: user,
            },
            relations: ['orders'],
          });
          // flat()의 기능은 Array를 밖으로 빼내는 것. 1은 한단계 레벨.
          // restaurant마다 orders가 나오는 2중 배열이지만 가장 밖 resrtaurant 배열은 사라짐.
          orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
          // status에 맞는 order로 필터
          if (status) {
            orders = orders.filter((order: Order) => order.status === status);
          }
          break;
      }
      return {
        ok: true,
        orders: orders,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not get orders.',
      };
    }
  }

  canSeeOrder(user: User, order: Order): boolean {
    let ok = true;
    if (order.customerId !== user.id && user.role === UserRole.Client) {
      ok = false;
    } else if (order.driverId !== user.id && user.role === UserRole.Delivery) {
      ok = false;
    } else if (
      order.restaurant.ownerId !== user.id &&
      user.role === UserRole.Owner
    ) {
      ok = false;
    }
    return ok;
  }

  async getOrder(
    user: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) {
        return {
          ok: false,
          error: 'Order not found.',
        };
      }

      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: 'You don`t have a permission to see the order',
        };
      }
      return {
        ok: true,
        order,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not get order.',
      };
    }
  }

  async editOrder(
    user: User,
    { id: orderId, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId);
      if (!order) {
        return {
          ok: false,
          error: 'Order not found.',
        };
      }
      // 해당 주문이 자신과 관련이 있어서 수정 권한이 있는지 확인한다.
      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: 'You don`t have a permission to edit the order',
        };
      }

      let ok = true;
      if (user.role === UserRole.Client) {
        // Client일 경우 주문을 수정할 수 없다.
        ok = false;
      } else if (user.role === UserRole.Owner) {
        // Owner의 경우 변경을 시도하려는 주문 상태가 Cooked와 Cooking인지 확인한다.
        if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
          ok = false;
        }
      } else if (user.role === UserRole.Delivery) {
        // Driver의 경우 변경을 시도하려는 주문 상태가 PickedUp인지 Delivery인지 확인한다.
        if (
          status !== OrderStatus.PickedUp &&
          status !== OrderStatus.Delivered
        ) {
          ok = false;
        }
      }
      if (!ok) {
        return {
          ok,
          error: 'You don`t have a permission to edit the order',
        };
      }
      // save로 리턴을 받는 경우, 현재 가지고 있는 필드와 업데이트 내용만 오브젝트로 받기 때문에
      // Subscription의 Payload로 전달할 수 없다.
      await this.orders.save({
        id: orderId,
        status,
      });
      // 현재 order는 업데이트 전의 값이므로 업데이트된 order형태로 payload에 전달한다.
      const newOrder = { ...order, status };
      // 레스토랑 주인이 Cooked로 변경했다면, 배달 기사에게 실시간으로 알린다.
      if (user.role === UserRole.Owner) {
        if (status === OrderStatus.Cooked) {
          this.pubSub.publish(NEW_COOKED_ORDER, {
            cookedOrder: newOrder,
          });
        }
      }
      // 주문이 수정되면 모든 관련자에게 알려준다.
      this.pubSub.publish(NEW_ORDER_UPDATE, { orderUpdates: newOrder });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not edit the order.',
      };
    }
  }

  async takeOrder(
    driver: User,
    { id }: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    try {
      const order = await this.orders.findOne(id);
      if (!order) {
        return {
          ok: false,
          error: 'Order not found.',
        };
      }
      if (order.driver) {
        return {
          ok: false,
          error: 'This order already has a driver.',
        };
      }
      await this.orders.save({
        id,
        driver,
        status: OrderStatus.PickedUp,
      });
      this.pubSub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: { ...order, driver, status: OrderStatus.PickedUp },
      });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not take the order..',
      };
    }
  }
}
