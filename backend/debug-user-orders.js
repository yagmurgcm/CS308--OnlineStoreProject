const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// Database config
const config = {
  host: process.env.DB_HOST || 'switchyard.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '39112'),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway',
  ssl: {
    rejectUnauthorized: false
  }
};

async function debugUserOrders() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Find "Plevneli Osman Paşa" user
    const [users] = await connection.execute(`
      SELECT id, name, email FROM \`user\` 
      WHERE name LIKE '%osman%' OR name LIKE '%plevneli%' OR name LIKE '%paşa%'
    `);

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    for (const user of users) {
      console.log(`\n👤 User: ${user.name} (ID: ${user.id}, Email: ${user.email})\n`);

      // Get orders for this user
      const [orders] = await connection.execute(`
        SELECT 
          o.id,
          o.status,
          o.totalPrice,
          o.createdAt,
          COUNT(od.id) as itemCount
        FROM \`order\` o
        LEFT JOIN \`order_detail\` od ON o.id = od.orderId
        WHERE o.userId = ?
        GROUP BY o.id
        ORDER BY o.createdAt DESC
      `, [user.id]);

      console.log(`📦 Orders in database: ${orders.length}`);
      if (orders.length > 0) {
        orders.forEach(order => {
          console.log(`  - Order #${order.id}: ${order.status}, ₺${parseFloat(order.totalPrice).toFixed(2)}, ${new Date(order.createdAt).toLocaleString('tr-TR')}`);
        });
      }

      // Check what the API would return
      console.log(`\n🔍 Testing API query for userId=${user.id}:`);
      const [apiOrders] = await connection.execute(`
        SELECT 
          o.id,
          o.status,
          o.totalPrice,
          o.createdAt
        FROM \`order\` o
        WHERE o.userId = ?
        ORDER BY o.createdAt DESC
      `, [user.id]);

      console.log(`  API would return: ${apiOrders.length} orders`);
      if (apiOrders.length > 0) {
        console.log(`  Order IDs: ${apiOrders.map(o => o.id).join(', ')}`);
      }

      // Check if there's a token issue - try to decode a sample token
      console.log(`\n🔐 Token info:`);
      console.log(`  JWT_SECRET: ${process.env.JWT_SECRET || 'dev_jwt_secret'}`);
      console.log(`  Token payload should have: { sub: ${user.id}, email: '${user.email}' }`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

debugUserOrders();

