import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/auth/role.decorator';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput } from './dtos/create-order.dto';
import { Order } from './entites/order.entity';

@Injectable()
@Role('Client')
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
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
      const order = await this.orders.save(
        this.orders.create({ customer, restaurant }),
      );
      console.log(order);
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
