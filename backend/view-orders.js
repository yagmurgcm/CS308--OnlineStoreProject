const mysql = require('mysql2/promise');

// Database config (from database.config.ts)
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

async function viewOrders() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Get all orders with user info
    const [orders] = await connection.execute(`
      SELECT 
        o.id,
        o.status,
        o.totalPrice,
        o.contactName,
        o.contactEmail,
        o.createdAt,
        u.id as userId,
        u.name as userName,
        u.email as userEmail,
        COUNT(od.id) as itemCount
      FROM \`order\` o
      LEFT JOIN \`user\` u ON o.userId = u.id
      LEFT JOIN \`order_detail\` od ON o.id = od.orderId
      GROUP BY o.id
      ORDER BY o.createdAt DESC
    `);

    console.log(`📦 Total Orders: ${orders.length}\n`);
    console.log('='.repeat(100));
    
    if (orders.length === 0) {
      console.log('No orders found in database.');
    } else {
      orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Order #${order.id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: ₺${parseFloat(order.totalPrice).toFixed(2)}`);
        console.log(`   Items: ${order.itemCount}`);
        console.log(`   User: ${order.userName || order.contactName || 'N/A'} (ID: ${order.userId || 'N/A'})`);
        console.log(`   Email: ${order.userEmail || order.contactEmail || 'N/A'}`);
        console.log(`   Created: ${new Date(order.createdAt).toLocaleString('tr-TR')}`);
        console.log('-'.repeat(100));
      });
    }

    // Check for "Plevneli Osman Paşa" user
    console.log('\n\n🔍 Searching for "Plevneli Osman Paşa"...\n');
    const [users] = await connection.execute(`
      SELECT id, name, email FROM \`user\` 
      WHERE name LIKE '%osman%' OR name LIKE '%plevneli%' OR name LIKE '%paşa%'
    `);

    if (users.length > 0) {
      console.log('Found users:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
      });

      // Get orders for these users
      for (const user of users) {
        const [userOrders] = await connection.execute(`
          SELECT id, status, totalPrice, createdAt 
          FROM \`order\` 
          WHERE userId = ?
          ORDER BY createdAt DESC
        `, [user.id]);

        console.log(`\n  Orders for ${user.name} (ID: ${user.id}): ${userOrders.length}`);
        if (userOrders.length > 0) {
          userOrders.forEach(order => {
            console.log(`    - Order #${order.id}: ${order.status}, ₺${parseFloat(order.totalPrice).toFixed(2)}, ${new Date(order.createdAt).toLocaleString('tr-TR')}`);
          });
        } else {
          console.log(`    ❌ No orders found for this user`);
        }
      }
    } else {
      console.log('❌ User "Plevneli Osman Paşa" not found in database');
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

viewOrders();

