/**
 * Importa los registros visibles de las capturas del usuario.
 * Solo se cargan filas con importe real; no se cargan "SIN VENTAS" ni "S/N" con total cero.
 *
 * Uso: node scripts/seed-june-july-records.mjs
 */
import { readFileSync } from "fs";
import pg from "pg";

const env = {};
const content = readFileSync(".env.local", "utf8");
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  env[key.trim()] = rest.join("=").trim();
}

if (!env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const migrationSql = `
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS source_key TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS comprobante_tipo TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS comprobante_numero TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS ruc TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS razon_social TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS item TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cantidad NUMERIC(12, 2);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(12, 2);
DROP INDEX IF EXISTS idx_movimientos_source_key;
CREATE UNIQUE INDEX idx_movimientos_source_key
  ON movimientos (source_key);
`;

const rows = [
  {
    source_key: "ventas-2026-06-22-eb01-1",
    tipo: "venta",
    fecha: "2026-06-22",
    comprobante_tipo: "boleta",
    comprobante_numero: "EB01-1",
    item: "SERVICIO DE MANTENIMIENTO PREVENTIVO DE EQUIPO DE CÓMPUTO",
    cantidad: 1,
    valor_unitario: 40.0,
    subtotal: 40.0,
    igv: 7.2,
    total: 47.2,
  },
  {
    source_key: "ventas-2026-06-29-f001-1",
    tipo: "venta",
    fecha: "2026-06-29",
    comprobante_tipo: "factura",
    comprobante_numero: "F001-1",
    razon_social: "RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L.",
    ruc: "20611393238",
    item: "SERVICIO DE DESARROLLO E IMPLEMENTACIÓN DE SOFTWARE EMPRESARIAL (VERTEX SOFTWARE ERP)",
    cantidad: 1,
    valor_unitario: 426.81,
    subtotal: 426.81,
    igv: 76.82,
    total: 503.63,
  },
  {
    source_key: "ventas-2026-06-30-f001-2",
    tipo: "venta",
    fecha: "2026-06-30",
    comprobante_tipo: "factura",
    comprobante_numero: "F001-2",
    razon_social: "RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L.",
    ruc: "20611393238",
    item: "SERVICIO DE DESARROLLO E IMPLEMENTACIÓN DE SOFTWARE EMPRESARIAL (VERTEX SOFTWARE ERP)",
    cantidad: 1,
    valor_unitario: 426.81,
    subtotal: 426.81,
    igv: 76.82,
    total: 503.63,
  },
  {
    source_key: "ventas-2026-07-07-eb01-2",
    tipo: "venta",
    fecha: "2026-07-07",
    comprobante_tipo: "boleta",
    comprobante_numero: "EB01-2",
    item: "INSTALACIÓN DE SOFTWARE",
    cantidad: 1,
    valor_unitario: 15.0,
    subtotal: 15.0,
    igv: 2.7,
    total: 17.7,
  },
  {
    source_key: "ventas-2026-07-09-eb01-3",
    tipo: "venta",
    fecha: "2026-07-09",
    comprobante_tipo: "boleta",
    comprobante_numero: "EB01-3",
    item: "MANTENIMIENTO PREVENTIVO DE LAPTOP",
    cantidad: 1,
    valor_unitario: 50.0,
    subtotal: 50.0,
    igv: 9.0,
    total: 59.0,
  },
  {
    source_key: "ventas-2026-07-12-eb01-4",
    tipo: "venta",
    fecha: "2026-07-12",
    comprobante_tipo: "boleta",
    comprobante_numero: "EB01-4",
    item: "INSTALACIÓN DE WINDOWS Y APLICACIONES ESENCIALES",
    cantidad: 1,
    valor_unitario: 237.29,
    subtotal: 237.29,
    igv: 42.71,
    total: 280.0,
  },
  {
    source_key: "ventas-2026-07-13-f001-3",
    tipo: "venta",
    fecha: "2026-07-13",
    comprobante_tipo: "factura",
    comprobante_numero: "F001-3",
    razon_social: "RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L.",
    ruc: "20611393238",
    item: "MANTENIMIENTO DE IMPRESORA",
    cantidad: 3,
    valor_unitario: 84.75,
    subtotal: 254.25,
    igv: 45.76,
    total: 300.0,
  },
  {
    source_key: "compras-2026-07-06-f001-0000148",
    tipo: "compra",
    fecha: "2026-07-06",
    comprobante_tipo: "factura",
    comprobante_numero: "F001-0000148",
    razon_social: "CELUCENTER S.A.C.",
    ruc: "20604851573",
    item: "CARGADOR SACO 120W",
    cantidad: 1,
    valor_unitario: 42.37,
    subtotal: 42.37,
    igv: 7.63,
    total: 50.0,
  },
];

function descripcion(row) {
  const parts = [];
  if (row.comprobante_numero) parts.push(`${row.comprobante_tipo?.toUpperCase()}: ${row.comprobante_numero}`);
  if (row.razon_social) parts.push(`Proveedor: ${row.razon_social}`);
  if (row.ruc) parts.push(`RUC: ${row.ruc}`);
  parts.push(`Cantidad: ${row.cantidad}`);
  parts.push(`Valor unitario: S/ ${row.valor_unitario.toFixed(2)}`);
  return parts.join(" · ");
}

try {
  await client.connect();
  await client.query(migrationSql);

  for (const row of rows) {
    await client.query(
      `
      INSERT INTO movimientos (
        source_key, tipo, concepto, descripcion, comprobante_tipo, comprobante_numero,
        ruc, razon_social, item, cantidad, valor_unitario, monto, incluye_igv,
        subtotal, igv, total, fecha
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, false,
        $13, $14, $15, $16
      )
      ON CONFLICT (source_key) DO UPDATE SET
        tipo = EXCLUDED.tipo,
        concepto = EXCLUDED.concepto,
        descripcion = EXCLUDED.descripcion,
        comprobante_tipo = EXCLUDED.comprobante_tipo,
        comprobante_numero = EXCLUDED.comprobante_numero,
        ruc = EXCLUDED.ruc,
        razon_social = EXCLUDED.razon_social,
        item = EXCLUDED.item,
        cantidad = EXCLUDED.cantidad,
        valor_unitario = EXCLUDED.valor_unitario,
        monto = EXCLUDED.monto,
        incluye_igv = EXCLUDED.incluye_igv,
        subtotal = EXCLUDED.subtotal,
        igv = EXCLUDED.igv,
        total = EXCLUDED.total,
        fecha = EXCLUDED.fecha,
        updated_at = NOW()
      `,
      [
        row.source_key,
        row.tipo,
        row.item,
        descripcion(row),
        row.comprobante_tipo,
        row.comprobante_numero,
        row.ruc ?? null,
        row.razon_social ?? null,
        row.item,
        row.cantidad,
        row.valor_unitario,
        row.subtotal,
        row.subtotal,
        row.igv,
        row.total,
        row.fecha,
      ]
    );
  }

  const totals = await client.query(`
    SELECT
      COUNT(*)::int AS cantidad,
      COALESCE(SUM(CASE WHEN tipo = 'venta' THEN total ELSE 0 END), 0)::numeric(12,2) AS ventas,
      COALESCE(SUM(CASE WHEN tipo = 'compra' THEN total ELSE 0 END), 0)::numeric(12,2) AS compras,
      COALESCE(SUM(CASE WHEN tipo = 'venta' THEN total ELSE -total END), 0)::numeric(12,2) AS balance
    FROM movimientos
    WHERE source_key = ANY($1)
  `, [rows.map((row) => row.source_key)]);

  console.log("Importación completada sin duplicar registros.");
  console.table(totals.rows);
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
