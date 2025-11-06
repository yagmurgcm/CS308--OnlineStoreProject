import { join } from 'path';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { AuthToken } from '../auth/auth-token.entity';
import { LoginLog } from '../auth/login-log.entity';
import { Cart } from '../cart/cart.entity';
import { CartItem } from '../cart/cart-item.entity';
import { Product } from '../product/product.entity';
import { User } from '../users/user.entity';

type Overrides = Partial<MysqlConnectionOptions>;

const DEFAULT_ENTITIES: MysqlConnectionOptions['entities'] = [
  Product,
  User,
  AuthToken,
  Cart,
  CartItem,
  LoginLog,
];

const DEFAULT_MIGRATIONS: MysqlConnectionOptions['migrations'] = [
  join(__dirname, '..', 'migrations', '*{.ts,.js}'),
];

const coerceBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
};

export const getDatabaseConfig = (overrides: Overrides = {}): MysqlConnectionOptions => {
  const portValue = Number(process.env.DB_PORT ?? 3306);
  const { entities, migrations, ...restOverrides } = overrides;

  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.isNaN(portValue) ? 3306 : portValue,
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '1234',
    database: process.env.DB_NAME ?? 'onlinestore',
    synchronize: coerceBoolean(process.env.TYPEORM_SYNC, true),
    logging: coerceBoolean(process.env.TYPEORM_LOGGING, true),
    entities: entities ?? DEFAULT_ENTITIES,
    migrations: migrations ?? DEFAULT_MIGRATIONS,
    ...restOverrides,
  };
};
