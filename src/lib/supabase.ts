import { createClient } from "@supabase/supabase-js";
import type { Movimiento } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function createSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const MOVIMIENTOS_TABLE = "movimientos";
export const TAREAS_TABLE = "tareas";
export const DOCUMENTOS_BUCKET = "documentos";

export type { Movimiento };
