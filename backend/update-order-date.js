const mysql = require('mysql2/promise');

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

async function updateOrderDate() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Check if order 93 exists
    const [orders] = await connection.execute(`
      SELECT id, createdAt, totalPrice, status
      FROM \`order\`
      WHERE id = 93
    `);

    if (orders.length === 0) {
      console.log('❌ Order #93 not found');
      return;
    }

    const order = orders[0];
    console.log('📦 Current Order #93:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Current Date: ${order.createdAt}`);
    console.log(`   Total Price: ${order.totalPrice}`);
    console.log(`   Status: ${order.status}\n`);

    // Update to December 3, 2025
    const newDate = '2025-12-03 00:00:00';
    await connection.execute(`
      UPDATE \`order\`
      SET createdAt = ?, updatedAt = ?
      WHERE id = 93
    `, [newDate, newDate]);

    console.log(`✅ Order #93 date updated to: ${newDate}`);

    // Verify the update
    const [updatedOrders] = await connection.execute(`
      SELECT id, createdAt, updatedAt
      FROM \`order\`
      WHERE id = 93
    `);

    if (updatedOrders.length > 0) {
      console.log('\n📋 Updated Order #93:');
      console.log(`   ID: ${updatedOrders[0].id}`);
      console.log(`   Created At: ${updatedOrders[0].createdAt}`);
      console.log(`   Updated At: ${updatedOrders[0].updatedAt}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.sql) {
      console.error('SQL:', err.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

updateOrderDate();
