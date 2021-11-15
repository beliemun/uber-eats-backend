import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dish } from './entities/dish.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repository/category.repository';
import {
  CategoriesResolver,
  DishResolver,
  RestaurantsResolver,
} from './restaurants.resolver';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Dish, CategoryRepository])],
  providers: [
    RestaurantsResolver,
    RestaurantsService,
    CategoriesResolver,
    DishResolver,
  ],
})
export class RestaurantsModule {}
