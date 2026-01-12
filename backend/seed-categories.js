// Seed default categories
const mysql = require('mysql2/promise');

async function seedCategories() {
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Create category table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS category (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        parentId INT,
        isActive BOOLEAN DEFAULT true,
        sortOrder INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES category(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Category table created/verified');

    // Check if categories already exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM category');
    if (existing[0].count > 0) {
      console.log('📋 Categories already seeded. Showing current categories:');
      const [cats] = await connection.execute('SELECT * FROM category ORDER BY parentId IS NULL DESC, sortOrder, name');
      cats.forEach(c => {
        const prefix = c.parentId ? '  └─' : '📁';
        console.log(`${prefix} ${c.name} (ID: ${c.id})`);
      });
      await connection.end();
      return;
    }

    // Main categories
    const mainCategories = [
      { name: 'Women', description: 'Women\'s fashion and clothing', sortOrder: 1 },
      { name: 'Men', description: 'Men\'s fashion and clothing', sortOrder: 2 },
      { name: 'Beauty', description: 'Beauty and skincare products', sortOrder: 3 },
    ];

    console.log('\n🌱 Seeding main categories...');
    const categoryIds = {};
    
    for (const cat of mainCategories) {
      const [result] = await connection.execute(
        'INSERT INTO category (name, description, sortOrder) VALUES (?, ?, ?)',
        [cat.name, cat.description, cat.sortOrder]
      );
      categoryIds[cat.name] = result.insertId;
      console.log(`  ✅ ${cat.name} (ID: ${result.insertId})`);
    }

    // Subcategories
    const subcategories = [
      // Women
      { name: 'Coats & Jackets', parent: 'Women', sortOrder: 1 },
      { name: 'Dresses', parent: 'Women', sortOrder: 2 },
      { name: 'Knitwear', parent: 'Women', sortOrder: 3 },
      { name: 'Tops', parent: 'Women', sortOrder: 4 },
      { name: 'Trousers', parent: 'Women', sortOrder: 5 },
      { name: 'Skirts', parent: 'Women', sortOrder: 6 },
      // Men
      { name: 'Coats & Jackets', parent: 'Men', sortOrder: 1 },
      { name: 'Shirts', parent: 'Men', sortOrder: 2 },
      { name: 'T-Shirts', parent: 'Men', sortOrder: 3 },
      { name: 'Trousers', parent: 'Men', sortOrder: 4 },
      { name: 'Knitwear', parent: 'Men', sortOrder: 5 },
      // Beauty
      { name: 'Skincare', parent: 'Beauty', sortOrder: 1 },
      { name: 'Haircare', parent: 'Beauty', sortOrder: 2 },
      { name: 'Makeup', parent: 'Beauty', sortOrder: 3 },
      { name: 'Fragrance', parent: 'Beauty', sortOrder: 4 },
    ];

    console.log('\n🌱 Seeding subcategories...');
    for (const sub of subcategories) {
      const parentId = categoryIds[sub.parent];
      await connection.execute(
        'INSERT INTO category (name, parentId, sortOrder) VALUES (?, ?, ?)',
        [sub.name, parentId, sub.sortOrder]
      );
      console.log(`  ✅ ${sub.parent} > ${sub.name}`);
    }

    console.log('\n🎉 Categories seeded successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

seedCategories();

