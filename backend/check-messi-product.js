const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'switchyard.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '39112'),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway',
  ssl: { rejectUnauthorized: false }
};

async function checkMessiProduct() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Messi ürününü bul
    const [products] = await connection.execute(`
      SELECT 
        id,
        name,
        image,
        category,
        subcategory,
        description,
        price,
        stock,
        isActive
      FROM products
      WHERE name LIKE '%Messi%'
      ORDER BY id DESC
      LIMIT 5
    `);

    if (products.length === 0) {
      console.log('❌ No product named "Messi" found');
      return;
    }

    console.log(`📦 Found ${products.length} product(s) named "Messi":\n`);
    products.forEach((product, index) => {
      console.log(`${index + 1}. Product #${product.id}: "${product.name}"`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Subcategory: ${product.subcategory || 'N/A'}`);
      console.log(`   Image: ${product.image || '❌ NULL/EMPTY'}`);
      console.log(`   Price: ₺${parseFloat(product.price || 0).toFixed(2)}`);
      console.log(`   Stock: ${product.stock || 0}`);
      console.log(`   isActive: ${product.isActive ? '✅' : '❌'}`);
      console.log('');
    });

    // Variant'ları kontrol et
    if (products.length > 0) {
      const productId = products[0].id;
      const [variants] = await connection.execute(`
        SELECT 
          id,
          color,
          size,
          price,
          stock,
          image
        FROM product_variants
        WHERE productId = ?
        ORDER BY id
      `, [productId]);

      console.log(`📋 Variants for Product #${productId}: ${variants.length}\n`);
      if (variants.length > 0) {
        variants.forEach((variant, index) => {
          console.log(`   ${index + 1}. Variant #${variant.id}: ${variant.color} / ${variant.size}`);
          console.log(`      Price: ₺${parseFloat(variant.price || 0).toFixed(2)}`);
          console.log(`      Stock: ${variant.stock || 0}`);
          console.log(`      Image: ${variant.image || '❌ NULL/EMPTY'}`);
          console.log('');
        });
      } else {
        console.log('   ⚠️  No variants found for this product!');
      }
    }

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

checkMessiProduct();

