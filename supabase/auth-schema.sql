-- Tabla para clave de acceso (hash bcrypt, nunca texto plano)
CREATE TABLE IF NOT EXISTS app_auth (
  key TEXT PRIMARY KEY DEFAULT 'access_code',
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_auth ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo service_role puede leer/escribir
