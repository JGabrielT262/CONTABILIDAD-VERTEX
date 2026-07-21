import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  createSupabaseAdmin,
  createSupabaseClient,
  TAREAS_TABLE,
} from "@/lib/supabase";
import type { TipoTarea } from "@/lib/types";

function lastDayIso(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dayOfMonthIso(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate();
  const d = Math.min(Math.max(1, day), last);
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    let query = supabase
      .from(TAREAS_TABLE)
      .select("*")
      .order("fecha", { ascending: true });

    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("crear");
    if (!user) {
      return NextResponse.json(
        { error: "No tienes permiso para crear tareas" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();
    const body = await request.json();

    const titulo = String(body.titulo || "").trim();
    const descripcion = String(body.descripcion || "").trim() || null;
    const tipo = (String(body.tipo || "general") as TipoTarea) || "general";
    const monto_usd = body.monto_usd != null ? parseFloat(body.monto_usd) : null;
    const ruc = String(body.ruc || "").replace(/\D/g, "") || null;
    const razon_social = String(body.razon_social || "").trim() || null;
    const modo = String(body.modo || "unica"); // unica | fin_mes | dia_mes
    const year = parseInt(String(body.year || ""));
    const monthStart = parseInt(String(body.month_start || body.month || ""));
    const monthsCount = Math.max(1, parseInt(String(body.months_count || "1")));
    const diaMes = Math.max(1, Math.min(31, parseInt(String(body.dia_mes || "13")) || 13));
    const fechaUnica = String(body.fecha || "");
    const sourcePrefix = String(body.source_prefix || "").trim() || null;

    if (!titulo) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const rows: Record<string, unknown>[] = [];

    if (modo === "fin_mes" || modo === "dia_mes") {
      if (!year || !monthStart || monthStart < 1 || monthStart > 12) {
        return NextResponse.json(
          { error: "Indica año y mes de inicio válidos" },
          { status: 400 }
        );
      }

      for (let i = 0; i < monthsCount; i++) {
        let y = year;
        let m = monthStart + i;
        while (m > 12) {
          m -= 12;
          y += 1;
        }
        const fecha =
          modo === "dia_mes"
            ? dayOfMonthIso(y, m, diaMes)
            : lastDayIso(y, m);
        const source_key = sourcePrefix
          ? `${sourcePrefix}-${y}-${String(m).padStart(2, "0")}`
          : null;
        rows.push({
          titulo,
          descripcion,
          fecha,
          tipo,
          monto_usd: Number.isFinite(monto_usd as number) ? monto_usd : null,
          ruc,
          razon_social,
          estado: "pendiente",
          ...(source_key ? { source_key } : {}),
        });
      }
    } else {
      if (!fechaUnica) {
        return NextResponse.json({ error: "Indica la fecha" }, { status: 400 });
      }
      rows.push({
        titulo,
        descripcion,
        fecha: fechaUnica,
        tipo,
        monto_usd: Number.isFinite(monto_usd as number) ? monto_usd : null,
        ruc,
        razon_social,
        estado: "pendiente",
      });
    }

    // Evita duplicar series con source_key (upsert parcial: ignora conflictos)
    if (sourcePrefix) {
      const { data: existing } = await supabase
        .from(TAREAS_TABLE)
        .select("source_key")
        .like("source_key", `${sourcePrefix}-%`);
      const existingKeys = new Set((existing || []).map((e) => e.source_key));
      const filtered = rows.filter(
        (r) => !r.source_key || !existingKeys.has(String(r.source_key))
      );
      if (filtered.length === 0) {
        return NextResponse.json(
          { message: "Las tareas de esta serie ya existen", data: [] },
          { status: 200 }
        );
      }
      const { data, error } = await supabase
        .from(TAREAS_TABLE)
        .insert(filtered)
        .select();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data, { status: 201 });
    }

    const { data, error } = await supabase
      .from(TAREAS_TABLE)
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
