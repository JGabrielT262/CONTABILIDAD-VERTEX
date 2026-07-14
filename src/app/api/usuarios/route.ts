import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  requirePermission,
  USUARIOS_TABLE,
  type UsuarioRow,
} from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase";

function publicUser(row: UsuarioRow) {
  return {
    id: row.id,
    nombre: row.nombre,
    puede_crear_movimientos: row.puede_crear_movimientos,
    puede_borrar_movimientos: row.puede_borrar_movimientos,
    puede_gestionar_perfiles: row.puede_gestionar_perfiles,
    activo: row.activo,
    created_at: row.created_at,
  };
}

export async function GET() {
  const admin = await requirePermission("gestionar");
  if (!admin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from(USUARIOS_TABLE)
    .select(
      "id, nombre, puede_crear_movimientos, puede_borrar_movimientos, puede_gestionar_perfiles, activo, created_at, updated_at, password_hash"
    )
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data || []) as UsuarioRow[]).map(publicUser)
  );
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission("gestionar");
  if (!admin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const nombre = String(body.nombre || "").trim();
    const codigo = String(body.codigo || "");

    if (!nombre || codigo.length < 4) {
      return NextResponse.json(
        { error: "Nombre y código (mín. 4 caracteres) son obligatorios" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const password_hash = await hashPassword(codigo);

    const { data, error } = await supabase
      .from(USUARIOS_TABLE)
      .insert({
        nombre,
        password_hash,
        puede_crear_movimientos: true,
        puede_borrar_movimientos: false,
        puede_gestionar_perfiles: false,
        activo: true,
      })
      .select(
        "id, nombre, puede_crear_movimientos, puede_borrar_movimientos, puede_gestionar_perfiles, activo, created_at, updated_at, password_hash"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(publicUser(data as UsuarioRow), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
