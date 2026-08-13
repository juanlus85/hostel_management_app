-- Ejecutar una única vez en phpMyAdmin sobre producción.
-- Añade el perfil Tablet sin modificar los usuarios existentes.
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','admin','housekeeping','tablet') NOT NULL DEFAULT 'user';
