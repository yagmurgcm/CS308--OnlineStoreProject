// List all categories
const mysql = require('mysql2/promise');

async function listCategories() {
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const [categories] = await connection.execute(
      'SELECT * FROM category ORDER BY parentId IS NULL DESC, name'
    );

    console.log('📋 All Categories:');
    console.log('==================\n');
    
    categories.forEach(cat => {
      const prefix = cat.parentId ? '  └─' : '📁';
      const active = cat.isActive ? '✓' : '✗';
      console.log(`${prefix} ${active} ${cat.name} (ID: ${cat.id}, Parent: ${cat.parentId || 'None'})`);
    });

    // Find Furniture specifically
    const [furniture] = await connection.execute(
      'SELECT * FROM category WHERE name LIKE ?',
      ['%Furniture%']
    );

    if (furniture.length > 0) {
      console.log('\n🪑 Furniture Categories Found:');
      furniture.forEach(cat => {
        console.log(`  - ID: ${cat.id}, Name: ${cat.name}, Active: ${cat.isActive}`);
      });
    } else {
      console.log('\n❌ No Furniture category found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

listCategories();

