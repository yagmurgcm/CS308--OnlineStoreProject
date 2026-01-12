// Script to update an order's createdAt date to 35 days ago
// This is for testing the 30-day return window feature

const mysql = require('mysql2/promise');

async function updateOrderDate() {
  // Railway database connection
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // First, list recent orders
    const [orders] = await connection.execute(
      'SELECT id, userId, status, totalPrice, createdAt FROM `order` ORDER BY id DESC LIMIT 10'
    );
    
    console.log('\n📋 Son 10 sipariş:');
    console.log('─'.repeat(80));
    orders.forEach(o => {
      console.log(`ID: ${o.id} | User: ${o.userId} | Status: ${o.status} | Total: ${o.totalPrice} | Created: ${o.createdAt}`);
    });

    // Restore Order #64 to processing status (undo cancel)
    console.log('\n🔧 Order #64 durumunu "processing" olarak geri alıyorum...');
    
    await connection.execute(
      'UPDATE `order` SET status = ? WHERE id = ?',
      ['processing', 64]
    );
    
    console.log('✅ Order #64 durumu "processing" olarak güncellendi!');
    console.log('\n📌 Şu an Order #64:');
    console.log('   - Tarih: 35 gün önce (8 Aralık 2025)');
    console.log('   - Durum: processing');
    console.log('   - Return: ❌ Yapılamaz (30 gün geçti)');
    console.log('   - Cancel: ❌ Yapılamaz (30 gün geçti)');

  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await connection.end();
  }
}

updateOrderDate();

