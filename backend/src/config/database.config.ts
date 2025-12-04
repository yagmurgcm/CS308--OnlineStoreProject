import { join } from 'path';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

// Auth
import { AuthToken } from '../auth/auth-token.entity';
import { LoginLog } from '../auth/login-log.entity';

// Cart
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';

// Product
import { Product } from '../product/entities/product.entity';
import { ProductVariant } from '../product/product-variant.entity';

// Users
import { User } from '../users/user.entity';

// Order
import { Order } from '../order/order.entity';
import { OrderDetail } from '../order/order-detail.entity';

// Reviews
import { Review } from '../reviews/review.entity';

type Overrides = Partial<MysqlConnectionOptions>;

const DEFAULT_ENTITIES: MysqlConnectionOptions['entities'] = [
  Product,
  ProductVariant,
  User,
  AuthToken,
  Cart,
  CartItem,
  LoginLog,
  Order,
  OrderDetail,
  Review,
];

const DEFAULT_MIGRATIONS: MysqlConnectionOptions['migrations'] = [
  join(__dirname, '..', 'migrations', '*{.ts,.js}'),
];

const coerceBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
};

export const getDatabaseConfig = (
  overrides: Overrides = {},
): MysqlConnectionOptions => {
  const { entities, migrations, ...restOverrides } = overrides;

  return {
    type: 'mysql',

    // 🔥 RAILWAY BAĞLANTIN (KESİN DOĞRU)
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    username: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',

    synchronize: coerceBoolean(process.env.TYPEORM_SYNC, true),
    logging: coerceBoolean(process.env.TYPEORM_LOGGING, false),

    entities: entities ?? DEFAULT_ENTITIES,
    migrations: migrations ?? DEFAULT_MIGRATIONS,
    ...restOverrides,

    ssl: {
      rejectUnauthorized: false,
    },
  };
};
