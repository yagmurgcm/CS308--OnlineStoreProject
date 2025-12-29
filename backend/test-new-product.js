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

async function testNewProduct() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // 1. Tablo yapısını kontrol et
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM products
    `);
    console.log('📋 Products table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // 2. En son eklenen 5 ürünü bul
    console.log('📦 Checking last 5 products added:\n');
    const [recentProducts] = await connection.execute(`
      SELECT 
        id,
        name,
        category,
        isActive
      FROM products
      ORDER BY id DESC
      LIMIT 5
    `);

    if (recentProducts.length === 0) {
      console.log('❌ No products found in database');
      return;
    }

    recentProducts.forEach((product, index) => {
      console.log(`${index + 1}. Product #${product.id}: "${product.name}"`);
      console.log(`   Category: ${product.category}`);
      console.log(`   isActive: ${product.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
      console.log(`   Created: ${new Date(product.createdAt).toLocaleString('tr-TR')}`);
      console.log('');
    });

    // 2. isActive=false olan ürünler var mı kontrol et
    const [inactiveProducts] = await connection.execute(`
      SELECT COUNT(*) as count FROM products WHERE isActive = 0
    `);
    console.log(`\n📊 Statistics:`);
    console.log(`   Inactive products: ${inactiveProducts[0].count}`);

    // 3. API endpoint'i simüle et - findAll query
    console.log(`\n🔍 Testing API endpoint simulation (findAll):\n`);
    
    // isActive filtresi OLMADAN (mevcut durum)
    const [allProducts] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.isActive,
        COUNT(pv.id) as variantCount
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.productId
      GROUP BY p.id
      ORDER BY p.id DESC
      LIMIT 10
    `);

    console.log(`   Products returned by API (NO isActive filter): ${allProducts.length}`);
    allProducts.forEach(p => {
      const status = p.isActive ? '✅' : '❌';
      console.log(`   ${status} Product #${p.id}: "${p.name}" (variants: ${p.variantCount})`);
    });

    // 4. isActive filtresi İLE (olması gereken)
    const [activeProducts] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.isActive,
        COUNT(pv.id) as variantCount
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.productId
      WHERE p.isActive = 1
      GROUP BY p.id
      ORDER BY p.id DESC
      LIMIT 10
    `);

    console.log(`\n   Products that SHOULD be returned (WITH isActive filter): ${activeProducts.length}`);
    activeProducts.forEach(p => {
      console.log(`   ✅ Product #${p.id}: "${p.name}" (variants: ${p.variantCount})`);
    });

    // 5. Sonuç
    console.log(`\n📝 CONCLUSION:`);
    const inactiveInList = allProducts.filter(p => !p.isActive).length;
    if (inactiveInList > 0) {
      console.log(`   ⚠️  PROBLEM: ${inactiveInList} inactive product(s) are being returned by API!`);
      console.log(`   ⚠️  These products should NOT appear on the website.`);
      console.log(`   💡 SOLUTION: Add "WHERE isActive = 1" filter to findAll() method.`);
    } else {
      console.log(`   ✅ All returned products are active.`);
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

testNewProduct();

