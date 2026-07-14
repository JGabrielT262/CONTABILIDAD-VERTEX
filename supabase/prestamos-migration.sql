-- Migration: préstamos con fecha de devolución + cobros
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE movimientos ADD CONSTRAINT movimientos_tipo_check
  CHECK (tipo IN (
    'venta',
    'compra',
    'retiro',
    'pago_igv',
    'pago_contador',
    'ingreso',
    'salida',
    'prestamo_recibido',
    'prestamo_otorgado',
    'cobro_prestamo'
  ));

ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS fecha_devolucion DATE;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS prestamo_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimientos_prestamo_id_fkey'
  ) THEN
    ALTER TABLE movimientos
      ADD CONSTRAINT movimientos_prestamo_id_fkey
      FOREIGN KEY (prestamo_id)
      REFERENCES movimientos(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movimientos_prestamo_id ON movimientos (prestamo_id);
