import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/auth/role.decorator';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { ConnectionIsNotSetError, Repository } from 'typeorm';
import { CreateOrderInput } from './dtos/create-order.dto';
import { OrderItem } from './entites/order-item.entity';
import { Order } from './entites/order.entity';

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
      for (const item of items) {
        // 주문 받은 음식 찾기
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return {
            ok: false,
            error: 'Dish not found.',
          };
        }
        console.log(`Dish price: ${dish.price}Won`);
        // 추가 가격이 있는지 찾기
        for (const itemOption of item.options) {
          const dishOption = dish.options.find(
            (dishOption) => dishOption.name === itemOption.name,
          );
          // 추가 옵션이 있다면
          if (dishOption) {
            // 옵션 자체에 가격이 있다면
            if (dishOption.extra) {
              console.log(`+${dishOption.extra}Won`);
            } else {
              // 옵션 자체에 가격이 없다면 세부 옵션 가격을 찾는다.
              const dishOptionChoice = dishOption.choices.find(
                (choice) => choice.name === itemOption.choice,
              );
              if (dishOptionChoice) {
                // 세부 옵션의 가격이 있다면
                if (dishOptionChoice.extra) {
                  console.log(`+${dishOptionChoice.extra}Won`);
                }
              }
            }
          }
        }

        // await this.orderItems.save(
        //   this.orderItems.create({
        //     dish,
        //     options: item.options,
        //   }),
        // );
      }
      //   const order = await this.orders.save(
      //     this.orders.create({ customer, restaurant }),
      //   );
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
}
