/**
 * Script de seed para insertar los negocios iniciales
 * Ejecutar con: tsx seed-businesses.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { businesses } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

async function seedBusinesses() {
  console.log('🌱 Iniciando seed de negocios...');
  
  // Verificar que DATABASE_URL esté configurada
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurada en el archivo .env');
    process.exit(1);
  }

  let connection;
  
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log('✅ Conexión a la base de datos establecida');

    // Verificar si ya existen negocios
    const existingBusinesses = await db.select().from(businesses);
    
    if (existingBusinesses.length > 0) {
      console.log(`ℹ️  Ya existen ${existingBusinesses.length} negocios en la base de datos:`);
      existingBusinesses.forEach(b => {
        console.log(`   - ${b.name} (${b.code})`);
      });
      console.log('✅ No es necesario insertar negocios');
      return;
    }

    // Insertar negocios iniciales
    console.log('📝 Insertando negocios iniciales...');
    
    await db.insert(businesses).values([
      {
        name: 'Hostel',
        code: 'hostel',
        description: 'Gestión del hostel',
        isActive: true,
      },
      {
        name: 'Tienda',
        code: 'tienda',
        description: 'Gestión de la tienda',
        isActive: true,
      },
    ]);

    console.log('✅ Negocios insertados correctamente:');
    console.log('   - Hostel (hostel)');
    console.log('   - Tienda (tienda)');
    
    // Verificar inserción
    const insertedBusinesses = await db.select().from(businesses);
    console.log(`✅ Total de negocios en la base de datos: ${insertedBusinesses.length}`);

  } catch (error) {
    console.error('❌ Error al insertar negocios:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar seed
seedBusinesses()
  .then(() => {
    console.log('🎉 Seed completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
