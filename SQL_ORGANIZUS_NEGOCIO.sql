-- Solo como respaldo para instalaciones de producción sin acceso a la aplicación.
-- La aplicación añade Organizus automáticamente al abrir Facturas.
INSERT INTO businesses (name, code, description, isActive)
SELECT 'Organizus', 'organizus', 'Organizus', 1
WHERE NOT EXISTS (
  SELECT 1 FROM businesses WHERE code = 'organizus'
);
