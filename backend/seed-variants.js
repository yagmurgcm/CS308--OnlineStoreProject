/**
 * DEMO SENARYO İÇİN BEDEN VE STOK SEED SCRIPT (v4)
 * 
 * - 2 ürün: OUT OF STOCK (stokta yok)
 * - 5 ürün: LOW STOCK (sınırda - turuncu uyarı)
 * - Kalanlar: HIGH STOCK
 */

const mysql = require('mysql2/promise');

const config = {
  host: 'switchyard.proxy.rlwy.net',
  port: 39112,
  user: 'root',
  password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
  database: 'railway',
};

const colorPalettes = {
  coats: ['Camel', 'Black', 'Navy', 'Burgundy', 'Charcoal'],
  jackets: ['Black', 'Olive', 'Tan', 'Navy'],
  knitwear: ['Cream', 'Gray', 'Navy', 'Burgundy', 'Forest Green'],
  trousers: ['Black', 'Navy', 'Khaki', 'Charcoal', 'Beige'],
  shirts: ['White', 'Light Blue', 'Pink', 'Navy', 'Striped'],
  scarves: ['Camel', 'Gray', 'Burgundy', 'Navy'],
  default: ['Black', 'Navy', 'Gray']
};

function getColorsForProduct(productName) {
  const name = productName.toLowerCase();
  if (name.includes('coat') || name.includes('parka')) return colorPalettes.coats;
  if (name.includes('jacket') || name.includes('shacket')) return colorPalettes.jackets;
  if (name.includes('knit') || name.includes('sweater')) return colorPalettes.knitwear;
  if (name.includes('trouser') || name.includes('chino') || name.includes('jean')) return colorPalettes.trousers;
  if (name.includes('shirt')) return colorPalettes.shirts;
  if (name.includes('scarf')) return colorPalettes.scarves;
  return colorPalettes.default;
}

function selectRandomColors(colors) {
  const count = Math.floor(Math.random() * 3) + 2;
  const shuffled = [...colors].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function seedVariants() {
  const connection = await mysql.createConnection(config);
  console.log('✅ Connected to database');

  try {
    const [products] = await connection.execute(
      `SELECT id, name, category, price FROM products WHERE category IN ('Women', 'Men') ORDER BY id`
    );
    console.log(`📦 Found ${products.length} Women/Men products`);

    const sizes = ['XS', 'S', 'M', 'L', 'XL'];

    // Stok tipi indeksleri:
    // Index 0, 1: OUT OF STOCK (2 ürün)
    // Index 2, 3, 4, 5, 6: LOW STOCK (5 ürün)
    // Geri kalan: HIGH STOCK

    for (const product of products) {
      console.log(`\n🔧 Processing: ${product.name} (ID: ${product.id})`);

      await connection.execute(
        `DELETE FROM product_variants WHERE productId = ?`,
        [product.id]
      );

      const allColors = getColorsForProduct(product.name);
      const productColors = selectRandomColors(allColors);
      console.log(`  🎨 Colors: ${productColors.join(', ')}`);

      const productIndex = products.indexOf(product);
      let stockType;
      
      if (productIndex <= 1) {
        // İlk 2 ürün: OUT OF STOCK
        stockType = 'out_of_stock';
        console.log('  ❌ Type: OUT OF STOCK');
      } else if (productIndex >= 2 && productIndex <= 6) {
        // Sonraki 5 ürün: LOW STOCK
        stockType = 'low_stock';
        console.log('  ⚠️ Type: LOW STOCK (sınırda)');
      } else {
        // Geri kalanlar: HIGH STOCK
        stockType = 'high_stock';
        console.log('  ✅ Type: HIGH STOCK');
      }

      let totalStock = 0;

      for (const color of productColors) {
        for (const size of sizes) {
          let stock;
          
          switch (stockType) {
            case 'out_of_stock':
              stock = 0;
              break;
              
            case 'low_stock':
              // Sadece ilk renkte ve M/L bedenlerinde 1-3 adet stok
              if (color === productColors[0]) {
                if (size === 'M') {
                  stock = Math.floor(Math.random() * 3) + 1; // 1-3 arası
                } else if (size === 'L') {
                  stock = Math.floor(Math.random() * 2) + 1; // 1-2 arası
                } else {
                  stock = 0;
                }
              } else {
                stock = 0;
              }
              break;
              
            case 'high_stock':
              const baseStock = Math.floor(Math.random() * 15) + 10;
              if (size === 'M' || size === 'L') {
                stock = baseStock + Math.floor(Math.random() * 10);
              } else if (size === 'S') {
                stock = baseStock;
              } else {
                stock = Math.floor(baseStock * 0.6);
              }
              break;
          }

          totalStock += stock;

          await connection.execute(
            `INSERT INTO product_variants (productId, color, size, price, stock, createdAt) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [product.id, color, size, product.price, stock]
          );
        }
      }

      await connection.execute(
        `UPDATE products SET stock = ? WHERE id = ?`,
        [totalStock, product.id]
      );

      console.log(`  ✅ Total stock: ${totalStock}`);
    }

    console.log('\n' + '='.repeat(65));
    console.log('📋 DEMO SENARYO ÖZETİ:');
    console.log('='.repeat(65));
    
    const [summary] = await connection.execute(`
      SELECT 
        p.id, 
        p.name, 
        (SELECT GROUP_CONCAT(DISTINCT pv.color) FROM product_variants pv WHERE pv.productId = p.id) as colors,
        (SELECT SUM(pv.stock) FROM product_variants pv WHERE pv.productId = p.id) as total_stock
      FROM products p 
      WHERE p.category IN ('Women', 'Men') 
      ORDER BY p.id
    `);

    console.log('\n❌ OUT OF STOCK (2 ürün):');
    summary.slice(0, 2).forEach((p) => {
      console.log(`   ${p.id}. ${p.name} - Stock: ${p.total_stock}`);
    });

    console.log('\n⚠️ LOW STOCK - Sınırda (5 ürün):');
    summary.slice(2, 7).forEach((p) => {
      console.log(`   ${p.id}. ${p.name} - Stock: ${p.total_stock}`);
    });

    console.log('\n✅ HIGH STOCK (kalanlar):');
    summary.slice(7).forEach((p) => {
      console.log(`   ${p.id}. ${p.name} - Stock: ${p.total_stock}`);
    });

    console.log('\n✅ Seed completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

seedVariants();
