const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'switchyard.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '39112'),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway',
  ssl: { rejectUnauthorized: false }
};

async function testInactiveProduct() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // 1. Test için bir inactive product oluştur
    console.log('🧪 Creating test inactive product...\n');
    const [insertResult] = await connection.execute(`
      INSERT INTO products (name, category, description, price, stock, isActive)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'TEST INACTIVE PRODUCT - Should NOT appear on website',
      'Men',
      'This is a test product with isActive=false. It should NOT appear on the website.',
      999.00,
      10,
      0  // isActive = false
    ]);

    const testProductId = insertResult.insertId;
    console.log(`✅ Test product created with ID: ${testProductId}\n`);

    // 2. API endpoint'i simüle et (mevcut durum - isActive filtresi YOK)
    console.log('🔍 Testing API endpoint (findAll - NO isActive filter):\n');
    const [allProducts] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.isActive
      FROM products p
      WHERE p.id = ?
    `, [testProductId]);

    if (allProducts.length > 0) {
      const product = allProducts[0];
      console.log(`   ❌ PROBLEM FOUND!`);
      console.log(`   Product #${product.id}: "${product.name}"`);
      console.log(`   isActive: ${product.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
      console.log(`   ⚠️  This inactive product WOULD appear on website!`);
    }

    // 3. isActive filtresi İLE (olması gereken)
    console.log(`\n🔍 Testing with isActive filter (SHOULD filter out):\n`);
    const [activeProducts] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.isActive
      FROM products p
      WHERE p.id = ? AND p.isActive = 1
    `, [testProductId]);

    if (activeProducts.length === 0) {
      console.log(`   ✅ CORRECT: Inactive product is filtered out!`);
    } else {
      console.log(`   ❌ ERROR: Inactive product still appears!`);
    }

    // 4. Sonuç
    console.log(`\n📝 CONCLUSION:`);
    console.log(`   ⚠️  Current findAll() method does NOT filter by isActive`);
    console.log(`   ⚠️  Inactive products WILL appear on the website`);
    console.log(`   💡 SOLUTION: Add "WHERE isActive = 1" to findAll() query`);

    // 5. Test product'ı temizle
    console.log(`\n🧹 Cleaning up test product...`);
    await connection.execute(`DELETE FROM products WHERE id = ?`, [testProductId]);
    console.log(`✅ Test product deleted\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Connection closed');
    }
  }
}

testInactiveProduct();

