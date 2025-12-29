const mysql = require('mysql2/promise');

async function fixMenVariants() {
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
  });

  // Eksik varyantları olan Men ürünleri
  const productsToFix = [
    { id: 37, name: 'Men Lightweight Puffer Jacket', colors: ['Black', 'Navy', 'Olive'] },
    { id: 38, name: 'Men Stretch Joggers', colors: ['Charcoal', 'Olive', 'Black'] },
    { id: 41, name: 'Men Oversized Cotton Hoodie', colors: ['Black', 'Gray', 'Navy'] },
    { id: 42, name: 'Midnight Rebel Leather Jacket', colors: ['Black', 'Brown'] },
    { id: 43, name: 'Lumberjack Red Plaid Flannel Shirt', colors: ['Red', 'Green', 'Blue'] },
    { id: 44, name: 'Western Black Embroidered Cowboy Shirt', colors: ['Black', 'White', 'Navy'] },
    { id: 45, name: "Men's Waterproof Outdoor Rain Jacket", colors: ['Yellow', 'Black', 'Navy'] },
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  // Önce mevcut varyantların fiyatlarını al
  const [existingVariants] = await connection.execute(
    `SELECT productId, price FROM product_variants WHERE productId IN (37, 38, 41, 42, 43, 44, 45) LIMIT 7`
  );
  
  const priceMap = {};
  existingVariants.forEach(v => {
    priceMap[v.productId] = v.price;
  });

  console.log('Price map:', priceMap);

  // Mevcut eksik varyantları sil ve yeniden oluştur
  for (const product of productsToFix) {
    console.log(`\n🔧 Fixing: ${product.name} (ID: ${product.id})`);
    
    // Mevcut varyantları sil
    await connection.execute(
      `DELETE FROM product_variants WHERE productId = ?`,
      [product.id]
    );
    console.log(`  ❌ Deleted old variants`);

    const price = priceMap[product.id] || 99.99;

    // Yeni varyantları ekle
    for (const color of product.colors) {
      for (const size of sizes) {
        // Random stok: 8-30 arası
        const stock = Math.floor(Math.random() * 23) + 8;
        
        await connection.execute(
          `INSERT INTO product_variants (productId, color, size, stock, price) VALUES (?, ?, ?, ?, ?)`,
          [product.id, color, size, stock, price]
        );
      }
    }
    console.log(`  ✅ Added ${product.colors.length * sizes.length} variants (${product.colors.length} colors × ${sizes.length} sizes)`);
  }

  // Sonucu kontrol et
  const [result] = await connection.execute(
    `SELECT pv.productId, p.name, COUNT(*) as variantCount 
     FROM product_variants pv 
     JOIN products p ON pv.productId = p.id 
     WHERE pv.productId IN (37, 38, 41, 42, 43, 44, 45) 
     GROUP BY pv.productId, p.name`
  );

  console.log('\n✅ Final variant counts:');
  result.forEach(r => console.log(`  ${r.name}: ${r.variantCount} variants`));

  await connection.end();
  console.log('\n🎉 Done!');
}

fixMenVariants().catch(console.error);








