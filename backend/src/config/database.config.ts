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
import { WishlistItem } from '../wishlist/wishlist-item.entity';

// Support
import { Conversation } from '../support/conversation.entity';
import { Message } from '../support/message.entity';
import { ChatAttachment } from '../support/chat-attachment.entity';

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
  WishlistItem,
  Conversation,
  Message,
  ChatAttachment,
];

const DEFAULT_MIGRATIONS: MysqlConnectionOptions['migrations'] = [
  join(__dirname, '..', 'migrations', '*{.ts,.js}'),
];

const resolveNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const FALLBACK_DB = {
  host: 'switchyard.proxy.rlwy.net',
  port: 39112,
  username: 'root',
  password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
  database: 'railway',
};

const readDatabaseConfig = () => {
  const host =
    process.env.DB_HOST ??
    process.env.MYSQLHOST ??
    process.env.DB_URL ??
    FALLBACK_DB.host;
  const port = resolveNumber(
    process.env.DB_PORT ?? process.env.MYSQLPORT,
    FALLBACK_DB.port,
  );
  const username =
    process.env.DB_USERNAME ??
    process.env.DB_USER ??
    process.env.MYSQLUSER ??
    FALLBACK_DB.username;
  const password =
    process.env.DB_PASSWORD ??
    process.env.MYSQLPASSWORD ??
    FALLBACK_DB.password;
  const database =
    process.env.DB_NAME ??
    process.env.MYSQLDATABASE ??
    FALLBACK_DB.database;

  if (!host || !database || !username || !password || !Number.isFinite(port)) {
    throw new Error(
      'Database configuration is incomplete. Please set DB_* environment variables.',
    );
  }

  return { host, port, username, password, database };
};

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
  const { host, port, username, password, database } = readDatabaseConfig();

  return {
    type: 'mysql',

    host,
    port,
    username,
    password,
    database,

    synchronize: coerceBoolean(process.env.TYPEORM_SYNC, false),
    logging: coerceBoolean(process.env.TYPEORM_LOGGING, false),

    entities: entities ?? DEFAULT_ENTITIES,
    migrations: migrations ?? DEFAULT_MIGRATIONS,
    ...restOverrides,

    ssl: {
      rejectUnauthorized: false,
    },
  };
};
