/**
 * Script para verificar conexión y crear tablas en Supabase.
 * Uso: node scripts/setup-db.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  try {
    const content = readFileSync(".env.local", "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    console.error("No se encontró .env.local");
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase.from("movimientos").select("id").limit(1);

if (error) {
  if (error.message.includes("does not exist") || error.code === "42P01") {
    console.log("TABLA_NO_EXISTE");
    console.log("\nEjecuta el SQL en Supabase Dashboard > SQL Editor:");
    console.log("Archivo: supabase/schema.sql");
    process.exit(2);
  }
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("OK - Conexión exitosa. Tabla movimientos lista.");
console.log(`Registros encontrados: ${data?.length ?? 0}`);
