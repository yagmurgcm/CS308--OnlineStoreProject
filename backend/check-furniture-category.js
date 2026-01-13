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

async function checkFurnitureCategory() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Check for any furniture categories (case insensitive)
    const [categories] = await connection.execute(
      'SELECT * FROM category WHERE LOWER(name) LIKE ?',
      ['%furniture%']
    );

    if (categories.length === 0) {
      console.log('✅ No furniture categories found. All furniture categories have been deleted.');
    } else {
      console.log(`⚠️  Found ${categories.length} furniture category(ies):`);
      categories.forEach(cat => {
        console.log(`  - ID: ${cat.id}, Name: ${cat.name}, Parent ID: ${cat.parentId}, Active: ${cat.isActive}`);
      });
    }

    // Also check products that might still reference furniture
    const [products] = await connection.execute(
      'SELECT COUNT(*) as count FROM products WHERE LOWER(category) LIKE ? OR LOWER(subcategory) LIKE ?',
      ['%furniture%', '%furniture%']
    );

    if (products[0].count > 0) {
      console.log(`\n⚠️  Warning: ${products[0].count} product(s) still reference furniture category/subcategory.`);
    } else {
      console.log('\n✅ No products reference furniture category.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

checkFurnitureCategory();

