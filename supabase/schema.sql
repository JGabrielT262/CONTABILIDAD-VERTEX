-- ============================================================
-- CONTABILIDAD VERTEX - Esquema Supabase
-- Ejecuta este SQL en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabla de movimientos contables
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('venta', 'compra', 'retiro', 'pago_igv', 'pago_contador', 'ingreso', 'salida', 'prestamo_recibido', 'prestamo_otorgado', 'cobro_prestamo', 'deposito_detraccion', 'retiro_detraccion')),
  concepto TEXT NOT NULL,
  descripcion TEXT,
  comprobante_tipo TEXT,
  comprobante_numero TEXT,
  ruc TEXT,
  razon_social TEXT,
  item TEXT,
  cantidad NUMERIC(12, 2),
  valor_unitario NUMERIC(12, 2),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  incluye_igv BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  igv NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_devolucion DATE,
  prestamo_id UUID REFERENCES movimientos(id) ON DELETE CASCADE,
  documento_url TEXT,
  documento_nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas por período
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos (tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON movimientos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_prestamo_id ON movimientos (prestamo_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_movimientos_source_key
  ON movimientos (source_key);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movimientos_updated_at ON movimientos;
CREATE TRIGGER movimientos_updated_at
  BEFORE UPDATE ON movimientos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Storage: bucket para documentos adjuntos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage (acceso público para lectura, inserción autenticada vía service role)
CREATE POLICY "Documentos públicos lectura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentos');

CREATE POLICY "Documentos inserción"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Documentos actualización"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documentos');

CREATE POLICY "Documentos eliminación"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documentos');

-- RLS en movimientos (acceso abierto vía anon key - protegido por código de acceso en app)
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura movimientos"
  ON movimientos FOR SELECT
  USING (true);

CREATE POLICY "Inserción movimientos"
  ON movimientos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Actualización movimientos"
  ON movimientos FOR UPDATE
  USING (true);

CREATE POLICY "Eliminación movimientos"
  ON movimientos FOR DELETE
  USING (true);
