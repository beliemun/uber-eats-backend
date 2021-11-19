import { Injectable } from '@nestjs/common';
import { Cron, Interval, SchedulerRegistry, Timeout } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from './dtos/create-payment.dto';
import { GetPaymentsOutput } from './dtos/get-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    private schdulerRegistry: SchedulerRegistry,
  ) {}

  async createPayment(
    user: User,
    { restaurantId, transactionId }: CreatePaymentInput,
  ): Promise<CreatePaymentOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found.',
        };
      }
      if (restaurant.ownerId !== user.id) {
        return {
          ok: false,
          error: 'You are not allowed to do this.',
        };
      }
      restaurant.isPromoted = true;
      const date = new Date();
      date.setDate(date.getDate() + 7);
      restaurant.promotedUntil = date;
      await this.restaurants.save(restaurant);
      await this.payments.save(
        this.payments.create({
          transactionId,
          user,
          restaurant,
        }),
      );
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not create a payment.',
      };
    }
  }

  async getPayments(user: User): Promise<GetPaymentsOutput> {
    try {
      const payments = await this.payments.find({
        user,
      });
      return {
        ok: true,
        payments,
      };
    } catch {
      return {
        ok: true,
        error: 'Could not get payments.',
      };
    }
  }

  // 10초마다 체크하도록 설정했지만, 실제 서버에서는 24시마다 체크하는 해야 함.
  @Interval(10000)
  async checkPromotedRestaurants() {
    const restaurants = await this.restaurants.find({
      isPromoted: true,
      // LessThan()는 TypeORM에서 제공.
      // promotedUntil이 오늘보다 이전인 restaurant를 찾는 조건도 추가
      promotedUntil: LessThan(new Date()),
    });
    console.log(restaurants);
    restaurants.forEach(async (restaurant) => {
      (restaurant.isPromoted = false),
        (restaurant.promotedUntil = null),
        await this.restaurants.save(restaurant);
    });
  }
}
