// Script para probar la lógica del cambio anterior
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function test() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Ver los cierres de caja del hostel (businessId = 1)
  const [rows] = await connection.execute(`
    SELECT id, businessId, date, previousChange, totalCash, changeForNextDay, status 
    FROM cash_closings 
    WHERE businessId = 1 
    ORDER BY date DESC 
    LIMIT 10
  `);
  
  console.log("Cierres de caja del Hostel:");
  console.table(rows);
  
  await connection.end();
}

test().catch(console.error);
