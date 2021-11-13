import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
} from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { Role } from 'src/auth/role.decorator';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { SeeCategoriesOutput } from './dtos/see-categories.dto';
import {
  SeeRestaurantsInput,
  SeeRestaurantsOutput,
} from './dtos/see-restaurants.dto';
import { Category } from './entities/caterogy.entity';
import { RestaurantsService } from './restaurants.service';

@Resolver(() => Restaurant)
export class RestaurantsResolver {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Mutation(() => CreateRestaurantOutput)
  @Role('Owner')
  createRestaurant(
    @AuthUser() authUser: User,
    @Args('input') createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    return this.restaurantsService.createRestaurant(
      authUser,
      createRestaurantInput,
    );
  }

  @Mutation(() => EditRestaurantOutput)
  @Role('Owner')
  editRestaurant(
    @AuthUser() authUser: User,
    @Args('input') editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    return this.restaurantsService.editRestaurant(
      authUser,
      editRestaurantInput,
    );
  }

  @Mutation(() => DeleteRestaurantOutput)
  @Role('Owner')
  deleteRestaurant(
    @AuthUser() authUser: User,
    @Args('input') deleteRestaurantInput: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    return this.restaurantsService.deleteRestaurant(
      authUser,
      deleteRestaurantInput,
    );
  }

  @Query(() => SeeRestaurantsOutput)
  seeRestaurants(
    @Args('input') seeRestaurantsInput: SeeRestaurantsInput,
  ): Promise<SeeCategoriesOutput> {
    return this.restaurantsService.seeRestaurants(seeRestaurantsInput);
  }

  @Query(() => RestaurantOutput)
  restaurant(
    @Args('input') restaurantInput: RestaurantInput,
  ): Promise<RestaurantOutput> {
    return this.restaurantsService.findRestaurantById(restaurantInput);
  }

  @Query(() => SearchRestaurantOutput)
  searchRestaurant(
    @Args('input') searchRestaurantInput: SearchRestaurantInput,
  ): Promise<SearchRestaurantOutput> {
    return this.restaurantsService.searchRestaurantByName(
      searchRestaurantInput,
    );
  }
}

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Query(() => CategoryOutput)
  category(
    @Args('input') categoryInput: CategoryInput,
  ): Promise<CategoryOutput> {
    return this.restaurantsService.findCategoryBySlug(categoryInput);
  }

  @Query(() => SeeCategoriesOutput)
  seeCategories(): Promise<SeeCategoriesOutput> {
    return this.restaurantsService.seeCategories();
  }

  // Computed field 혹은 dynamic field 라고도 한다. Entity에 정의하지 않고도 유저 정보에 의해 계산하여 전달할 수 있는 동적인 필드.
  @ResolveField(() => Int)
  restaurantCount(@Parent() category: Category): Promise<number> {
    return this.restaurantsService.countRestaurants(category);
  }
}
