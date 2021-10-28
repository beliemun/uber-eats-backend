"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const graphql_1 = require("@nestjs/graphql");
const typeorm_1 = require("@nestjs/typeorm");
const Joi = require("joi");
const users_module_1 = require("./users/users.module");
const user_entity_1 = require("./users/entities/user.entity");
const jwt_module_1 = require("./jwt/jwt.module");
const jwt_middleware_1 = require("./jwt/jwt.middleware");
const auth_module_1 = require("./auth/auth.module");
const verification_entity_1 = require("./users/entities/verification.entity");
const restaurants_module_1 = require("./restaurants/restaurants.module");
const restaurant_entity_1 = require("./restaurants/entities/restaurant.entity");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(jwt_middleware_1.JwtMiddleware).forRoutes({
            path: '/graphql',
            method: common_1.RequestMethod.POST,
        });
    }
};
AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env.test',
                ignoreEnvFile: process.env.NODE_ENV === 'production',
                validationSchema: Joi.object({
                    NODE_ENV: Joi.string().valid('dev', 'production').required(),
                    DB_HOST: Joi.string().required(),
                    DB_PORT: Joi.string().required(),
                    DB_USERNAME: Joi.string().required(),
                    DB_PASSSWORD: Joi.string().required(),
                    DB_NAME: Joi.string().required(),
                    TOKEN_PRIVATE_KEY: Joi.string().required(),
                }),
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST,
                port: +process.env.DB_PORT,
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSSWORD,
                database: process.env.DB_NAME,
                synchronize: process.env.NODE_ENV !== 'production',
                logging: process.env.NODE_ENV !== 'production',
                entities: [user_entity_1.User, verification_entity_1.Verification, restaurant_entity_1.Restaurant],
            }),
            graphql_1.GraphQLModule.forRoot({
                autoSchemaFile: true,
                context: ({ req }) => ({
                    user: req['user'],
                }),
            }),
            jwt_module_1.JwtModule.forRoot({ privateKey: process.env.TOKEN_PRIVATE_KEY }),
            users_module_1.UsersModule,
            restaurants_module_1.RestaurantsModule,
            auth_module_1.AuthModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map