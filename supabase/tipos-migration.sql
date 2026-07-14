-- Amplía tipos de movimiento permitidos
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
