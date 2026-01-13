// Update order #77 date to December 1, 2025
const mysql = require('mysql2/promise');

async function updateOrderDate() {
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if order exists
    const [orders] = await connection.execute(
      'SELECT id, createdAt, updatedAt FROM `order` WHERE id = ?',
      [77]
    );

    if (orders.length === 0) {
      console.log('❌ Order #77 not found');
      await connection.end();
      return;
    }

    console.log('📋 Current order #77:');
    console.log(`  Created: ${orders[0].createdAt}`);
    console.log(`  Updated: ${orders[0].updatedAt}`);

    // Update to December 1, 2025
    const newDate = '2025-12-01 00:00:00';
    
    await connection.execute(
      'UPDATE `order` SET createdAt = ?, updatedAt = ? WHERE id = ?',
      [newDate, newDate, 77]
    );

    console.log(`\n✅ Order #77 date updated to: ${newDate}`);

    // Verify
    const [updated] = await connection.execute(
      'SELECT id, createdAt, updatedAt FROM `order` WHERE id = ?',
      [77]
    );
    console.log('\n📋 Updated order #77:');
    console.log(`  Created: ${updated[0].createdAt}`);
    console.log(`  Updated: ${updated[0].updatedAt}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateOrderDate();

