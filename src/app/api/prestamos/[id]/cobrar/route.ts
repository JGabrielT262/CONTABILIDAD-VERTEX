import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  createSupabaseAdmin,
  createSupabaseClient,
  DOCUMENTOS_BUCKET,
  MOVIMIENTOS_TABLE,
} from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("crear");
    if (!user) {
      return NextResponse.json(
        { error: "No tienes permiso para registrar cobros" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const formData = await request.formData();

    const montoCobro = parseFloat(String(formData.get("monto") || ""));
    const fecha = String(
      formData.get("fecha") || new Date().toISOString().slice(0, 10)
    );
    const nota = String(formData.get("nota") || "").trim();
    const archivo = formData.get("documento") as File | null;

    if (!montoCobro || montoCobro <= 0 || !fecha) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const client = createSupabaseClient();
    const { data: prestamo, error: errPrestamo } = await client
      .from(MOVIMIENTOS_TABLE)
      .select("*")
      .eq("id", id)
      .eq("tipo", "prestamo_otorgado")
      .single();

    if (errPrestamo || !prestamo) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
    }

    const { data: cobros } = await client
      .from(MOVIMIENTOS_TABLE)
      .select("total")
      .eq("tipo", "cobro_prestamo")
      .eq("prestamo_id", id);

    const cobrado = (cobros || []).reduce(
      (sum, c) => sum + Number(c.total),
      0
    );
    const pendiente = Math.max(Number(prestamo.total) - cobrado, 0);

    if (pendiente <= 0) {
      return NextResponse.json(
        { error: "Este préstamo ya está cobrado" },
        { status: 400 }
      );
    }

    if (montoCobro > pendiente + 0.009) {
      return NextResponse.json(
        {
          error: `El monto supera lo pendiente (${pendiente.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    const persona =
      prestamo.razon_social ||
      String(prestamo.concepto || "").replace(/^Préstamo a\s+/i, "") ||
      "deudor";

    let documento_url: string | null = null;
    let documento_nombre: string | null = null;
    if (archivo && archivo.size > 0) {
      const ext = archivo.name.split(".").pop();
      const fileName = `cobro_prestamo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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
        tipo: "cobro_prestamo",
        concepto: `Cobro de préstamo de ${persona}`,
        descripcion: [
          `Deudor: ${persona}`,
          `Préstamo: ${prestamo.id}`,
          nota ? `Nota: ${nota}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        monto: montoCobro,
        incluye_igv: false,
        subtotal: montoCobro,
        igv: 0,
        total: montoCobro,
        fecha,
        prestamo_id: id,
        razon_social: persona,
        item: `Cobro de préstamo de ${persona}`,
        cantidad: 1,
        valor_unitario: montoCobro,
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
