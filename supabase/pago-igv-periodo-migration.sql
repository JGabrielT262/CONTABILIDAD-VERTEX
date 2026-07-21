-- Periodo del impuesto pagado y de dónde salió el dinero
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS periodo_impuesto TEXT;

ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS origen_fondo TEXT
  CHECK (origen_fondo IS NULL OR origen_fondo IN ('caja', 'detracciones'));

COMMENT ON COLUMN movimientos.periodo_impuesto IS
  'Periodo tributario YYYY-MM al que corresponde el pago (ej. pago IGV)';
COMMENT ON COLUMN movimientos.origen_fondo IS
  'caja = sale de caja operativa; detracciones = sale de cuenta SUNAT';
