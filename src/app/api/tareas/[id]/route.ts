import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createSupabaseAdmin, TAREAS_TABLE } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("crear");
    if (!user) {
      return NextResponse.json(
        { error: "No tienes permiso para actualizar tareas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const body = await request.json();
    const estado = body.estado === "hecha" ? "hecha" : "pendiente";

    const { data, error } = await supabase
      .from(TAREAS_TABLE)
      .update({ estado })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("borrar");
    if (!user) {
      return NextResponse.json(
        { error: "No tienes permiso para borrar tareas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from(TAREAS_TABLE).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
