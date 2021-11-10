import { Field, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Categoty } from './caterogy.entity';

@ObjectType()
@Entity()
export class Restaurant extends CoreEntity {
  @Field((type) => String)
  @Column()
  @Length(5)
  name: string;

  @Field((type) => String)
  @Column()
  @IsString()
  coverImage: string;

  @Field((type) => String, { defaultValue: 'KR' })
  @Column()
  @IsOptional()
  @IsString()
  address: string;

  @ManyToOne((type) => Categoty, (category) => category.restaurants)
  @Field((type) => Categoty)
  category: Categoty;
}
