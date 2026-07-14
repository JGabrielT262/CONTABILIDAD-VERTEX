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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("gestionar");
  if (!admin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createSupabaseAdmin();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.nombre != null) update.nombre = String(body.nombre).trim();
    if (body.activo != null) update.activo = !!body.activo;
    if (body.codigo && String(body.codigo).length >= 4) {
      update.password_hash = await hashPassword(String(body.codigo));
    }

    if (admin.id !== id) {
      update.puede_crear_movimientos = true;
      update.puede_borrar_movimientos = false;
      update.puede_gestionar_perfiles = false;
    }

    const { data, error } = await supabase
      .from(USUARIOS_TABLE)
      .update(update)
      .eq("id", id)
      .select(
        "id, nombre, puede_crear_movimientos, puede_borrar_movimientos, puede_gestionar_perfiles, activo, created_at, updated_at, password_hash"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(publicUser(data as UsuarioRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("gestionar");
  if (!admin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  if (admin.id === id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from(USUARIOS_TABLE).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
