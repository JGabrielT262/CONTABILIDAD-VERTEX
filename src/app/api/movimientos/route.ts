import { NextRequest, NextResponse } from "next/server";
import { calcularIgv } from "@/lib/igv";
import { requirePermission } from "@/lib/auth";
import {
  createSupabaseAdmin,
  createSupabaseClient,
  DOCUMENTOS_BUCKET,
  MOVIMIENTOS_TABLE,
} from "@/lib/supabase";
import { tipoAplicaIgv, type TipoMovimiento } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const tipo = searchParams.get("tipo");

    let query = supabase
      .from(MOVIMIENTOS_TABLE)
      .select("*")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);
    if (tipo) query = query.eq("tipo", tipo);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
        { error: "No tienes permiso para crear movimientos" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();
    const formData = await request.formData();

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
    const archivo = formData.get("documento") as File | null;
    const tiene_detraccion = (formData.get("tiene_detraccion") as string) || "";
    const monto_detraccion = parseFloat(
      (formData.get("monto_detraccion") as string) || "0"
    );
    const periodo_impuesto =
      (formData.get("periodo_impuesto") as string) || null;
    const origen_fondo_raw = (formData.get("origen_fondo") as string) || null;
    const origen_fondo =
      tipo === "pago_igv"
        ? origen_fondo_raw === "detracciones"
          ? "detracciones"
          : "caja"
        : null;

    if (!tipo || !concepto || !monto || !fecha) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (tipo === "pago_igv") {
      if (!periodo_impuesto || !/^\d{4}-\d{2}$/.test(periodo_impuesto)) {
        return NextResponse.json(
          { error: "Selecciona el periodo del IGV que estás pagando" },
          { status: 400 }
        );
      }
    }

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

    const aplicaIgv = tipoAplicaIgv(tipo);
    const esPrestamo =
      tipo === "prestamo_otorgado" || tipo === "prestamo_recibido";
    const { subtotal, igv, total } = calcularIgv(
      monto,
      incluye_igv,
      aplicaIgv && !esPrestamo
    );

    const esFacturaConDetraccion =
      comprobante_tipo === "factura" &&
      (tipo === "venta" || tipo === "compra") &&
      tiene_detraccion === "si";

    if (esFacturaConDetraccion) {
      if (!monto_detraccion || monto_detraccion <= 0) {
        return NextResponse.json(
          { error: "Ingresa el monto de la detracción" },
          { status: 400 }
        );
      }
      if (monto_detraccion >= total) {
        return NextResponse.json(
          { error: "La detracción debe ser menor al total de la factura" },
          { status: 400 }
        );
      }
    }

    if (
      comprobante_tipo === "factura" &&
      (tipo === "venta" || tipo === "compra") &&
      !tiene_detraccion
    ) {
      return NextResponse.json(
        { error: "Indica si la factura tiene detracciones" },
        { status: 400 }
      );
    }

    const valor_unitario = valorUnitarioRaw
      ? parseFloat(valorUnitarioRaw)
      : cantidad > 0
        ? Math.round((subtotal / cantidad) * 100) / 100
        : null;

    let documento_url: string | null = null;
    let documento_nombre: string | null = null;

    if (archivo && archivo.size > 0) {
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

      documento_url = urlData.publicUrl;
      documento_nombre = archivo.name;
    }

    const descripcionFinal =
      esFacturaConDetraccion && monto_detraccion > 0
        ? [descripcion, `Detracción: S/ ${monto_detraccion.toFixed(2)}`]
            .filter(Boolean)
            .join(" · ")
        : descripcion;

    if (tipo === "pago_igv" && origen_fondo === "detracciones") {
      const { data: todos, error: saldoError } = await supabase
        .from(MOVIMIENTOS_TABLE)
        .select("tipo,total,igv,origen_fondo");
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

    const { data, error } = await supabase
      .from(MOVIMIENTOS_TABLE)
      .insert({
        tipo,
        concepto,
        descripcion: descripcionFinal,
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
        documento_url,
        documento_nombre,
        periodo_impuesto: tipo === "pago_igv" ? periodo_impuesto : null,
        origen_fondo,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // En ventas, la detracción va a tu cuenta SUNAT (sale de caja operativa)
    if (tipo === "venta" && esFacturaConDetraccion) {
      const ref = comprobante_numero?.trim() || data.id.slice(0, 8);
      const { error: detError } = await supabase.from(MOVIMIENTOS_TABLE).insert({
        tipo: "deposito_detraccion",
        concepto: `Detracción factura ${ref}`,
        descripcion: `Detracción de venta ${concepto}`,
        monto: monto_detraccion,
        incluye_igv: false,
        subtotal: monto_detraccion,
        igv: 0,
        total: monto_detraccion,
        fecha,
        cantidad: 1,
        valor_unitario: monto_detraccion,
        comprobante_tipo,
        comprobante_numero,
        ruc,
        razon_social,
        item: `Detracción factura ${ref}`,
        documento_url: null,
        documento_nombre: null,
      });

      if (detError) {
        return NextResponse.json(
          {
            error: `Venta guardada, pero falló la detracción: ${detError.message}. Ejecuta la migración de detracciones en Supabase.`,
            movimiento: data,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
