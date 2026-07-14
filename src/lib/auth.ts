import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createSupabaseAdmin } from "./supabase";

export const AUTH_COOKIE = "vertex_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 días
export const USUARIOS_TABLE = "usuarios";

const enc = new TextEncoder();

export interface SessionUser {
  id: string;
  nombre: string;
  puede_crear: boolean;
  puede_borrar: boolean;
  puede_gestionar: boolean;
}

export interface UsuarioRow {
  id: string;
  nombre: string;
  password_hash: string;
  puede_crear_movimientos: boolean;
  puede_borrar_movimientos: boolean;
  puede_gestionar_perfiles: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no configurada");
  return secret;
}

async function getHmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function toBase64Url(text: string): string {
  const bytes = enc.encode(text);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const expires = Date.now() + AUTH_MAX_AGE * 1000;
  const payload = [
    "v2",
    user.id,
    toBase64Url(user.nombre),
    user.puede_crear ? "1" : "0",
    user.puede_borrar ? "1" : "0",
    user.puede_gestionar ? "1" : "0",
    String(expires),
  ].join(":");
  const sig = await getHmacHex(getSessionSecret(), payload);
  return `${payload}.${sig}`;
}

export async function parseSessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const parts = payload.split(":");

    // Legacy token: vertex:expires
    if (parts[0] === "vertex" && parts.length === 2) {
      const expires = parseInt(parts[1], 10);
      if (!expires || Date.now() > expires) return null;
      const expected = await getHmacHex(getSessionSecret(), payload);
      if (!safeEqual(sig, expected)) return null;
      return {
        id: "legacy",
        nombre: "Administrador",
        puede_crear: true,
        puede_borrar: true,
        puede_gestionar: true,
      };
    }

    if (parts[0] !== "v2" || parts.length !== 7) return null;
    const [, id, nombreB64, crear, borrar, gestionar, expiresStr] = parts;
    const expires = parseInt(expiresStr, 10);
    if (!expires || Date.now() > expires) return null;

    const expected = await getHmacHex(getSessionSecret(), payload);
    if (!safeEqual(sig, expected)) return null;

    return {
      id,
      nombre: fromBase64Url(nombreB64),
      puede_crear: crear === "1",
      puede_borrar: borrar === "1",
      puede_gestionar: gestionar === "1",
    };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<boolean> {
  return (await parseSessionToken(token)) != null;
}

export function rowToSessionUser(row: UsuarioRow): SessionUser {
  return {
    id: row.id,
    nombre: row.nombre,
    puede_crear: !!row.puede_crear_movimientos,
    puede_borrar: !!row.puede_borrar_movimientos,
    puede_gestionar: !!row.puede_gestionar_perfiles,
  };
}

export async function findUserByAccessCode(
  input: string
): Promise<SessionUser | null> {
  if (!input) return null;
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from(USUARIOS_TABLE)
    .select("*")
    .eq("activo", true);

  if (error || !data?.length) return null;

  for (const row of data as UsuarioRow[]) {
    const ok = await bcrypt.compare(input, row.password_hash);
    if (ok) return rowToSessionUser(row);
  }
  return null;
}

/** Compatibilidad: admin legacy de app_auth si aún no hay usuarios */
export async function verifyAccessCodeFromDb(input: string): Promise<boolean> {
  const user = await findUserByAccessCode(input);
  if (user) return true;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_auth")
    .select("password_hash")
    .eq("key", "access_code")
    .single();

  if (error || !data?.password_hash) return false;
  return bcrypt.compare(input, data.password_hash);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionUser()) != null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function requirePermission(
  kind: "crear" | "borrar" | "gestionar"
): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (kind === "crear" && !user.puede_crear) return null;
  if (kind === "borrar" && !user.puede_borrar) return null;
  if (kind === "gestionar" && !user.puede_gestionar) return null;
  return user;
}
