const mysql = require('mysql2/promise');

async function distributeOrders() {
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
  });

  // Tüm order id'lerini al
  const [orders] = await connection.execute("SELECT id FROM `order` ORDER BY id");
  const ids = orders.map(o => o.id);
  
  console.log(`Total orders: ${ids.length}`);
  
  // Shuffle array
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  
  // Dağılım: 10 processing, 9 in-transit, 14 delivered
  const processing = ids.slice(0, 10);
  const inTransit = ids.slice(10, 19);
  const delivered = ids.slice(19, 33);
  
  console.log(`Processing: ${processing.length} orders`);
  console.log(`In-Transit: ${inTransit.length} orders`);
  console.log(`Delivered: ${delivered.length} orders`);
  
  // Update processing
  if (processing.length > 0) {
    await connection.execute(
      `UPDATE \`order\` SET status = 'processing' WHERE id IN (${processing.join(',')})`
    );
  }
  
  // Update in-transit
  if (inTransit.length > 0) {
    await connection.execute(
      `UPDATE \`order\` SET status = 'in-transit' WHERE id IN (${inTransit.join(',')})`
    );
  }
  
  // Update delivered
  if (delivered.length > 0) {
    await connection.execute(
      `UPDATE \`order\` SET status = 'delivered' WHERE id IN (${delivered.join(',')})`
    );
  }
  
  // Verify
  const [result] = await connection.execute(
    "SELECT status, COUNT(*) as count FROM `order` GROUP BY status ORDER BY status"
  );
  console.log('\n✅ Final distribution:');
  result.forEach(r => console.log(`  ${r.status}: ${r.count}`));
  
  await connection.end();
}

distributeOrders().catch(console.error);

