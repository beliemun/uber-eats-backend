import { Args, Mutation, Query } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import {
  UpdateRestaurantInput,
  updateRestaurantOutput,
} from './dtos/update-restaurant.dto';
import { RestaurantsService } from './restauratns.service';

@Resolver(() => Restaurant)
export class RestaurantsResolver {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Query(() => [Restaurant])
  restaurants(): Promise<Restaurant[]> {
    return this.restaurantsService.getAll();
  }

  @Mutation(() => CreateRestaurantOutput)
  createRestaurant(
    @Args('input') createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    return this.restaurantsService.createRestaurant(createRestaurantInput);
  }

  @Mutation(() => updateRestaurantOutput)
  updateRestaurant(
    @Args('input') updateRestaurantInput: UpdateRestaurantInput,
  ): Promise<updateRestaurantOutput> {
    return this.restaurantsService.updateRestaurant(updateRestaurantInput);
  }
}
