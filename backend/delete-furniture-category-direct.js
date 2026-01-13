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

async function deleteFurnitureCategory() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Find Furniture category
    const [categories] = await connection.execute(
      'SELECT * FROM category WHERE name LIKE ?',
      ['%Furniture%']
    );

    if (categories.length === 0) {
      console.log('❌ Furniture category not found');
      return;
    }

    console.log('📋 Found Furniture categories:');
    categories.forEach(cat => {
      console.log(`  - ID: ${cat.id}, Name: ${cat.name}, Parent ID: ${cat.parentId}, Active: ${cat.isActive}`);
    });

    // Check if any products use this category
    for (const cat of categories) {
      const [products] = await connection.execute(
        'SELECT COUNT(*) as count FROM products WHERE category = ?',
        [cat.name]
      );
      
      if (products[0].count > 0) {
        console.log(`\n⚠️  Warning: Category "${cat.name}" (ID: ${cat.id}) is used by ${products[0].count} product(s).`);
        console.log(`   Deleting anyway...`);
      }

      // Delete subcategories first
      const [subcategories] = await connection.execute(
        'SELECT * FROM category WHERE parentId = ?',
        [cat.id]
      );
      
      if (subcategories.length > 0) {
        console.log(`\n📋 Deleting ${subcategories.length} subcategory(ies) under "${cat.name}":`);
        for (const subcat of subcategories) {
          await connection.execute(
            'DELETE FROM category WHERE id = ?',
            [subcat.id]
          );
          console.log(`  ✅ Deleted subcategory "${subcat.name}" (ID: ${subcat.id})`);
        }
      }

      // Delete the main category
      await connection.execute(
        'DELETE FROM category WHERE id = ?',
        [cat.id]
      );
      console.log(`\n✅ Deleted category "${cat.name}" (ID: ${cat.id})`);
    }

    console.log('\n✅ Done!');
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

deleteFurnitureCategory();


