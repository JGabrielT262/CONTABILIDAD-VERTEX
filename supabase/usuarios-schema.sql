-- Usuarios del sistema (códigos de acceso + permisos)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  puede_crear_movimientos BOOLEAN NOT NULL DEFAULT true,
  puede_borrar_movimientos BOOLEAN NOT NULL DEFAULT false,
  puede_gestionar_perfiles BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios (activo);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: acceso vía service_role desde la app
