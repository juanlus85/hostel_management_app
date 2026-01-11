/**
 * Script para eliminar automáticamente huéspedes que tengan más de 3 días desde su fecha de entrada.
 * Los PDFs ya generados se conservan en la carpeta Registros/.
 * 
 * Este script debe ejecutarse diariamente mediante cron o similar.
 */

import * as db from './db';

async function cleanupOldGuests() {
  try {
    console.log('[Cleanup] Iniciando limpieza de huéspedes antiguos...');
    
    // Obtener todos los huéspedes
    const guests = await db.getAllGuests();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let deletedCount = 0;
    
    for (const guest of guests) {
      if (!guest.checkInDate) continue;
      
      const checkInDate = new Date(guest.checkInDate);
      checkInDate.setHours(0, 0, 0, 0);
      
      // Calcular diferencia en días
      const diffTime = today.getTime() - checkInDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Si han pasado más de 3 días, eliminar
      if (diffDays > 3) {
        console.log(`[Cleanup] Eliminando huésped: ${guest.firstName} ${guest.lastName} (Check-in: ${checkInDate.toLocaleDateString()}, Días transcurridos: ${diffDays})`);
        await db.deleteGuest(guest.id);
        deletedCount++;
      }
    }
    
    console.log(`[Cleanup] Limpieza completada. ${deletedCount} huésped(es) eliminado(s).`);
    return { deletedCount };
  } catch (error) {
    console.error('[Cleanup] Error durante la limpieza:', error);
    throw error;
  }
}

export { cleanupOldGuests };
