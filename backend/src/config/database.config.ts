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
  // Portu number'a çeviriyoruz (Senin Railway portun)
  const portValue = 39112; 
  const { entities, migrations, ...restOverrides } = overrides;

  return {
    type: 'mysql',
    // --- BURAYI SENİN RAILWAY BİLGİLERİNLE DOLDURDUM ---
    host: 'switchyard.proxy.rlwy.net',
    port: portValue,
    username: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp', // Senin o uzun şifren
    database: 'railway', // Import ederken seçtiğimiz isim
    // ---------------------------------------------------

    synchronize: coerceBoolean(process.env.TYPEORM_SYNC, true), // Tabloları otomatik güncellesin diye true yaptım
    logging: coerceBoolean(process.env.TYPEORM_LOGGING, false),
    entities: entities ?? DEFAULT_ENTITIES,
    migrations: migrations ?? DEFAULT_MIGRATIONS,
    ...restOverrides,
    
    // DİKKAT: Railway gibi bulut sistemleri için bu SSL ayarı ŞARTTIR.
    ssl: {
        rejectUnauthorized: false
    }
  };
};