import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput } from './dtos/create-order.dto';
import { Order } from './entites/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
  ) {}

  async createOrder(customer: User, createOrderInput: CreateOrderInput) {
    try {
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
