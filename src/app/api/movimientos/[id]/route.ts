import { NextRequest, NextResponse } from "next/server";
import { calcularIgv } from "@/lib/igv";
import { requirePermission } from "@/lib/auth";
import {
  createSupabaseAdmin,
  DOCUMENTOS_BUCKET,
  MOVIMIENTOS_TABLE,
} from "@/lib/supabase";
import type { TipoMovimiento } from "@/lib/types";
import { tipoAplicaIgv } from "@/lib/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("borrar");
    if (!user) {
      return NextResponse.json(
        { error: "No tienes permiso para borrar movimientos" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    const { data: movimiento } = await supabase
      .from(MOVIMIENTOS_TABLE)
      .select("documento_url")
      .eq("id", id)
      .single();

    const { data: cobrosRelacionados } = await supabase
      .from(MOVIMIENTOS_TABLE)
      .select("documento_url")
      .eq("prestamo_id", id);

    const paths = [
      movimiento?.documento_url,
      ...(cobrosRelacionados || []).map((c) => c.documento_url),
    ]
      .filter((url): url is string => Boolean(url))
      .map((url) => url.split("/").pop())
      .filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      await supabase.storage.from(DOCUMENTOS_BUCKET).remove(paths);
    }

    const { error } = await supabase.from(MOVIMIENTOS_TABLE).delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("crear");
    if (!user) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar movimientos" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const formData = await request.formData();
    const soloDocumento = formData.get("solo_documento") === "true";
    const archivo = formData.get("documento") as File | null;

    if (soloDocumento) {
      if (!archivo || archivo.size === 0) {
        return NextResponse.json(
          { error: "Debes seleccionar un archivo" },
          { status: 400 }
        );
      }

      const { data: actual } = await supabase
        .from(MOVIMIENTOS_TABLE)
        .select("documento_url")
        .eq("id", id)
        .single();

      if (actual?.documento_url) {
        const oldPath = actual.documento_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from(DOCUMENTOS_BUCKET).remove([oldPath]);
        }
      }

      const ext = archivo.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .upload(fileName, archivo, { contentType: archivo.type });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from(MOVIMIENTOS_TABLE)
        .update({
          documento_url: urlData.publicUrl,
          documento_nombre: archivo.name,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const tipo = formData.get("tipo") as TipoMovimiento;
    const concepto = formData.get("concepto") as string;
    const descripcion = (formData.get("descripcion") as string) || null;
    const monto = parseFloat(formData.get("monto") as string);
    const incluye_igv = formData.get("incluye_igv") === "true";
    const fecha = formData.get("fecha") as string;
    const cantidadRaw = formData.get("cantidad") as string | null;
    const cantidad = cantidadRaw ? parseFloat(cantidadRaw) : 1;
    const valorUnitarioRaw = formData.get("valor_unitario") as string | null;
    const comprobante_tipo = (formData.get("comprobante_tipo") as string) || null;
    const comprobante_numero =
      (formData.get("comprobante_numero") as string) || null;
    const ruc = (formData.get("ruc") as string) || null;
    const razon_social = (formData.get("razon_social") as string) || null;
    const periodo_impuesto =
      (formData.get("periodo_impuesto") as string) || null;
    const origen_fondo_raw = (formData.get("origen_fondo") as string) || null;
    const origen_fondo =
      tipo === "pago_igv"
        ? origen_fondo_raw === "detracciones"
          ? "detracciones"
          : "caja"
        : null;

    const requiereDatosFiscales =
      tipo === "compra" ||
      (tipo === "venta" && comprobante_tipo === "factura");
    if (
      requiereDatosFiscales &&
      (!/^\d{11}$/.test(ruc || "") || !razon_social?.trim())
    ) {
      return NextResponse.json(
        {
          error:
            tipo === "compra"
              ? "En compras debes ingresar RUC y razón social"
              : "En ventas con factura debes ingresar RUC y razón social",
        },
        { status: 400 }
      );
    }

    if (tipo === "pago_igv") {
      if (!periodo_impuesto || !/^\d{4}-\d{2}$/.test(periodo_impuesto)) {
        return NextResponse.json(
          { error: "Selecciona el periodo del IGV que estás pagando" },
          { status: 400 }
        );
      }
    }

    const aplicaIgv = tipoAplicaIgv(tipo);
    const esPrestamo =
      tipo === "prestamo_otorgado" || tipo === "prestamo_recibido";
    const { subtotal, igv, total } = calcularIgv(
      monto,
      incluye_igv,
      aplicaIgv && !esPrestamo
    );

    const valor_unitario = valorUnitarioRaw
      ? parseFloat(valorUnitarioRaw)
      : cantidad > 0
        ? Math.round((subtotal / cantidad) * 100) / 100
        : null;

    if (tipo === "pago_igv" && origen_fondo === "detracciones") {
      const { data: todos, error: saldoError } = await supabase
        .from(MOVIMIENTOS_TABLE)
        .select("tipo,total,igv,origen_fondo")
        .neq("id", id);
      if (saldoError) {
        return NextResponse.json({ error: saldoError.message }, { status: 500 });
      }
      const { calcularResumen } = await import("@/lib/resumen");
      const saldo = calcularResumen(todos || []).saldoDetracciones;
      if (total > saldo) {
        return NextResponse.json(
          {
            error: `Saldo en detracciones insuficiente (disponible S/ ${saldo.toFixed(2)})`,
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      tipo,
      concepto,
      descripcion,
      monto,
      incluye_igv: aplicaIgv ? incluye_igv : false,
      subtotal,
      igv,
      total,
      fecha,
      cantidad,
      valor_unitario,
      comprobante_tipo,
      comprobante_numero,
      ruc,
      razon_social,
      item: concepto,
      periodo_impuesto: tipo === "pago_igv" ? periodo_impuesto : null,
      origen_fondo,
    };

    if (archivo && archivo.size > 0) {
      const ext = archivo.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .upload(fileName, archivo, { contentType: archivo.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(DOCUMENTOS_BUCKET)
          .getPublicUrl(fileName);
        updateData.documento_url = urlData.publicUrl;
        updateData.documento_nombre = archivo.name;
      }
    }

    const { data, error } = await supabase
      .from(MOVIMIENTOS_TABLE)
      .update(updateData)
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
