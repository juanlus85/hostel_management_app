-- Ejecutar una sola vez en producción para guardar el orden del calendario de Turnos.
ALTER TABLE users ADD COLUMN IF NOT EXISTS displayOrder INT NOT NULL DEFAULT 0;
