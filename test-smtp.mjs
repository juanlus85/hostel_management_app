import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

async function testSMTP() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute("SELECT `key`, `value` FROM system_settings WHERE `key` LIKE 'smtp%'");
  
  console.log("SMTP Configuration:");
  for (const row of rows) {
    if (row.key === 'smtp_password') {
      console.log(`  ${row.key}: ${'*'.repeat(row.value?.length || 0)}`);
    } else {
      console.log(`  ${row.key}: ${row.value}`);
    }
  }
  
  await connection.end();
}

testSMTP().catch(console.error);
