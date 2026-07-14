import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  createSupabaseAdmin,
  createSupabaseClient,
  DOCUMENTOS_BUCKET,
  MOVIMIENTOS_TABLE,
} from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createSupabaseClient();

    const [{ data: otorgados, error: errOtorgados }, { data: cobros, error: errCobros }] =
      await Promise.all([
        supabase
          .from(MOVIMIENTOS_TABLE)
          .select("*")
          .eq("tipo", "prestamo_otorgado")
          .order("fecha", { ascending: false }),
        supabase
          .from(MOVIMIENTOS_TABLE)
          .select("*")
          .eq("tipo", "cobro_prestamo")
          .order("fecha", { ascending: false }),
      ]);

    if (errOtorgados) {
      return NextResponse.json({ error: errOtorgados.message }, { status: 500 });
    }
    if (errCobros) {
      return NextResponse.json({ error: errCobros.message }, { status: 500 });
    }

    const cobradoPorPrestamo = new Map<string, number>();
    for (const cobro of cobros || []) {
      if (!cobro.prestamo_id) continue;
      const prev = cobradoPorPrestamo.get(cobro.prestamo_id) || 0;
      cobradoPorPrestamo.set(cobro.prestamo_id, prev + Number(cobro.total));
    }

    const lista = (otorgados || []).map((p) => {
      const total = Number(p.total);
      const cobrado = cobradoPorPrestamo.get(p.id) || 0;
      const pendiente = Math.max(total - cobrado, 0);
      return {
        ...p,
        cobrado,
        pendiente,
        estado: pendiente <= 0.009 ? "cobrado" : cobrado > 0 ? "parcial" : "pendiente",
      };
    });

    const meDeben = lista.reduce((sum, p) => sum + p.pendiente, 0);
    const totalPrestado = lista.reduce((sum, p) => sum + Number(p.total), 0);
    const totalCobrado = lista.reduce((sum, p) => sum + p.cobrado, 0);

    return NextResponse.json({
      prestamos: lista,
      cobros: cobros || [],
      meDeben,
      totalPrestado,
      totalCobrado,
    });
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
        { error: "No tienes permiso para registrar préstamos" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();
    const formData = await request.formData();

    const persona = String(formData.get("persona") || "").trim();
    const monto = parseFloat(String(formData.get("monto") || ""));
    const fecha = String(formData.get("fecha") || "");
    const fecha_devolucion = String(formData.get("fecha_devolucion") || "");
    const nota = String(formData.get("nota") || "").trim();
    const archivo = formData.get("documento") as File | null;

    if (!persona || !monto || monto <= 0 || !fecha || !fecha_devolucion) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (fecha_devolucion < fecha) {
      return NextResponse.json(
        { error: "La fecha de devolución no puede ser anterior al préstamo" },
        { status: 400 }
      );
    }

    let documento_url: string | null = null;
    let documento_nombre: string | null = null;
    if (archivo && archivo.size > 0) {
      const ext = archivo.name.split(".").pop();
      const fileName = `prestamo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .upload(fileName, archivo, { contentType: archivo.type });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .getPublicUrl(fileName);
      documento_url = urlData.publicUrl;
      documento_nombre = archivo.name;
    }

    const { data, error } = await supabase
      .from(MOVIMIENTOS_TABLE)
      .insert({
        tipo: "prestamo_otorgado",
        concepto: `Préstamo a ${persona}`,
        descripcion: [
          `Deudor: ${persona}`,
          `Devolución esperada: ${fecha_devolucion}`,
          nota ? `Nota: ${nota}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        monto,
        incluye_igv: false,
        subtotal: monto,
        igv: 0,
        total: monto,
        fecha,
        fecha_devolucion,
        razon_social: persona,
        item: `Préstamo a ${persona}`,
        cantidad: 1,
        valor_unitario: monto,
        documento_url,
        documento_nombre,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
