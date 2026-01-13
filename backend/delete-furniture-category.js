// Delete Furniture category
const mysql = require('mysql2/promise');

async function deleteFurnitureCategory() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'switchyard.proxy.rlwy.net',
    port: process.env.DB_PORT || 39112,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: process.env.DB_NAME || 'railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Find Furniture category
    const [categories] = await connection.execute(
      'SELECT * FROM category WHERE name LIKE ?',
      ['%Furniture%']
    );

    if (categories.length === 0) {
      console.log('❌ Furniture category not found');
      await connection.end();
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
        console.log(`⚠️  Warning: Category "${cat.name}" (ID: ${cat.id}) is used by ${products[0].count} product(s).`);
        console.log(`   Products must be moved to another category before deletion.`);
      } else {
        // Soft delete (set isActive = false)
        await connection.execute(
          'UPDATE category SET isActive = false WHERE id = ?',
          [cat.id]
        );
        console.log(`✅ Category "${cat.name}" (ID: ${cat.id}) has been deactivated (soft delete)`);
      }
    }

    // Also delete subcategories if any
    for (const cat of categories) {
      const [subcategories] = await connection.execute(
        'SELECT * FROM category WHERE parentId = ?',
        [cat.id]
      );
      
      if (subcategories.length > 0) {
        console.log(`\n📋 Found ${subcategories.length} subcategory(ies) under "${cat.name}":`);
        for (const subcat of subcategories) {
          const [subProducts] = await connection.execute(
            'SELECT COUNT(*) as count FROM products WHERE subcategory = ?',
            [subcat.name]
          );
          
          if (subProducts[0].count > 0) {
            console.log(`  ⚠️  Subcategory "${subcat.name}" (ID: ${subcat.id}) is used by ${subProducts[0].count} product(s).`);
          } else {
            await connection.execute(
              'UPDATE category SET isActive = false WHERE id = ?',
              [subcat.id]
            );
            console.log(`  ✅ Subcategory "${subcat.name}" (ID: ${subcat.id}) has been deactivated`);
          }
        }
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

deleteFurnitureCategory();

