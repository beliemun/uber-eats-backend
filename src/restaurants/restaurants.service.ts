import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { ILike, Like, Repository } from 'typeorm';
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
import { Category } from './entities/caterogy.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repository/category.repository';
import { SeeCategoriesOutput } from './dtos/see-categories.dto';
import { Args } from '@nestjs/graphql';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import {
  SeeRestaurantsInput,
  SeeRestaurantsOutput,
} from './dtos/see-restaurants.dto';
import { RestaurantInput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    // CustomRepository 참고 강의 - #10.9
    private readonly categories: CategoryRepository,
  ) {}

  async createRestaurant(
    authUser: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = authUser;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async editRestaurant(
    authUser: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOneOrFail(
        editRestaurantInput.restaurantId,
      );
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found.',
        };
      }
      if (authUser.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't edit a restaurant that you don't own.",
        };
      }
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      }
      // save를 할 때 id를 보내지 않는다는 것은 새로운 entity를 생성한다는 뜻.
      // save할 때 내부 배열을 삭제함. 왜 있어야 하는지 이유를 모르겠음. 강의 #10.10 하는 중.
      await this.restaurants.save({
        id: editRestaurantInput.restaurantId,
        ...editRestaurantInput,
        ...(category && { category }),
      });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not edit Restaurant.',
      };
    }
  }

  async deleteRestaurant(
    authUser: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found.',
        };
      }
      if (authUser.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't edit a restaurant that you don't own.",
        };
      }
      await this.restaurants.delete(restaurantId);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'Could not delete a restaurant.',
      };
    }
  }

  async seeCategories(): Promise<SeeCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load categories.',
      };
    }
  }

  countRestaurants(category: Category) {
    return this.restaurants.count({ category });
  }

  async findCategoryBySlug(
    @Args() { slug, page }: CategoryInput,
  ): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne(
        { slug },
        { relations: ['restaurants'] },
      );
      if (!category) {
        return {
          ok: false,
          error: 'Category not found.',
        };
      }
      const restaurants = await this.restaurants.find({
        where: {
          category,
        },
        take: 5,
        skip: (page - 1) * 5,
      });
      const totalResults = await this.countRestaurants(category);
      return {
        ok: true,
        category,
        restaurants,
        totalPages: Math.ceil(totalResults / 5),
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load category.',
      };
    }
  }

  async seeRestaurants({
    page,
  }: SeeRestaurantsInput): Promise<SeeRestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        skip: (page - 1) * 5,
        take: 5,
      });
      return {
        ok: true,
        results: restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / 5),
      };
    } catch {
      return {
        ok: true,
        error: 'Could not load restaurants.',
      };
    }
  }

  async findRestaurantById(restaurantInput: RestaurantInput) {
    try {
      const restaurant = await this.restaurants.findOne(
        restaurantInput.restaurantId,
      );
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restuarant not found.',
        };
      }
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: true,
        error: 'Could not find restaurant.',
      };
    }
  }

  async searchRestaurantByName({
    page,
    term,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      console.log(page, term);
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: {
          name: ILike(`%${term}%`),
        },
        skip: (page - 1) * 5,
        take: 5,
      });
      console.log(restaurants, totalResults);
      return {
        ok: true,
        restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / 5),
      };
    } catch {
      return {
        ok: false,
        error: 'Could not search for restaurants.',
      };
    }
  }
}
