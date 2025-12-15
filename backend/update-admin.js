const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updateAdmin() {
  const connection = await mysql.createConnection({
    host: 'switchyard.proxy.rlwy.net',
    port: 39112,
    user: 'root',
    password: 'ClCAOzGDlqJwDWcINlbVmCEaqAoCSDIp',
    database: 'railway',
  });

  const password = '123456';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Generated hash:', hash);

  // Önce mevcut admin'i sil
  await connection.execute("DELETE FROM user WHERE email = 'admin@gmail.com'");
  
  // Yeni admin ekle
  await connection.execute(
    "INSERT INTO user (name, email, password) VALUES (?, ?, ?)",
    ['Admin', 'admin@gmail.com', hash]
  );

  console.log('✅ Admin account created/updated!');
  console.log('Email: admin@gmail.com');
  console.log('Password: 123456');

  // Doğrula
  const [rows] = await connection.execute("SELECT id, email, name FROM user WHERE email = 'admin@gmail.com'");
  console.log('Admin user:', rows[0]);

  await connection.end();
}

updateAdmin().catch(console.error);





