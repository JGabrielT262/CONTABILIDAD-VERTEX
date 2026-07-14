-- Tareas futuras / recordatorios (calendario)
CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'general'
    CHECK (tipo IN ('general', 'factura', 'pago', 'otro')),
  monto_usd NUMERIC(12, 2),
  ruc TEXT,
  razon_social TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'hecha')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tareas_source_key
  ON tareas (source_key);

CREATE INDEX IF NOT EXISTS idx_tareas_fecha ON tareas (fecha DESC);

ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tareas' AND policyname = 'Lectura tareas'
  ) THEN
    CREATE POLICY "Lectura tareas" ON tareas FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tareas' AND policyname = 'Inserción tareas'
  ) THEN
    CREATE POLICY "Inserción tareas" ON tareas FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tareas' AND policyname = 'Actualización tareas'
  ) THEN
    CREATE POLICY "Actualización tareas" ON tareas FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tareas' AND policyname = 'Eliminación tareas'
  ) THEN
    CREATE POLICY "Eliminación tareas" ON tareas FOR DELETE USING (true);
  END IF;
END $$;
