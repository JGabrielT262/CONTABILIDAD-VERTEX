import { esIngreso, type Movimiento, type ResumenPeriodo } from "./types";

export type MovimientoResumen = Pick<Movimiento, "tipo" | "total" | "igv"> & {
  origen_fondo?: Movimiento["origen_fondo"];
  fecha?: string;
  periodo_impuesto?: string | null;
};

/**
 * Fecha contable del movimiento.
 * Pago IGV se imputa al periodo tributario (YYYY-MM), no a la fecha de pago.
 */
export function fechaContable(m: {
  tipo: string;
  fecha?: string;
  periodo_impuesto?: string | null;
}): string {
  if (
    m.tipo === "pago_igv" &&
    m.periodo_impuesto &&
    /^\d{4}-\d{2}$/.test(m.periodo_impuesto)
  ) {
    return `${m.periodo_impuesto}-01`;
  }
  return m.fecha || "";
}

export function perteneceAlMes(
  m: {
    tipo: string;
    fecha?: string;
    periodo_impuesto?: string | null;
  },
  desde: string,
  hasta: string
): boolean {
  const ref = fechaContable(m);
  return Boolean(ref) && ref >= desde && ref <= hasta;
}

export function calcularResumen(movimientos: MovimientoResumen[]): ResumenPeriodo {
  let totalIngresos = 0;
  let totalEgresos = 0;
  let totalVentas = 0;
  let totalCompras = 0;
  let totalIgvVentas = 0;
  let totalIgvCompras = 0;
  let totalPagosIgv = 0;
  let totalPrestamosOtorgados = 0;
  let totalDepositosDetraccion = 0;
  let totalRetirosDetraccion = 0;
  let totalPagosIgvDetracciones = 0;

  for (const m of movimientos) {
    const total = Number(m.total);
    const igv = Number(m.igv);
    const desdeDetracciones =
      m.tipo === "pago_igv" && m.origen_fondo === "detracciones";

    if (esIngreso(m.tipo)) {
      totalIngresos += total;
      if (m.tipo === "venta") {
        totalVentas += total;
        totalIgvVentas += igv;
      }
    } else if (!desdeDetracciones) {
      // Pago IGV desde detracciones no sale de la caja operativa
      totalEgresos += total;
      if (m.tipo === "compra") {
        totalCompras += total;
        totalIgvCompras += igv;
      }
    }

    if (m.tipo === "pago_igv") {
      totalPagosIgv += total;
      if (desdeDetracciones) totalPagosIgvDetracciones += total;
    }
    if (m.tipo === "prestamo_otorgado") totalPrestamosOtorgados += total;
    if (m.tipo === "deposito_detraccion") totalDepositosDetraccion += total;
    if (m.tipo === "retiro_detraccion") totalRetirosDetraccion += total;
  }

  const balance = totalIngresos - totalEgresos;
  const igvPendiente = Math.max(
    totalIgvVentas - totalIgvCompras - totalPagosIgv,
    0
  );

  return {
    totalIngresos,
    totalEgresos,
    balance,
    totalVentas,
    totalCompras,
    totalIgvVentas,
    totalIgvCompras,
    totalPagosIgv,
    totalPrestamosRecibidos: 0,
    totalPrestamosOtorgados,
    igvPendiente,
    // Caja neta = entradas − salidas de caja (sin restar IGV pendiente)
    cajaNetaDisponible: balance,
    saldoDetracciones: Math.max(
      totalDepositosDetraccion -
        totalRetirosDetraccion -
        totalPagosIgvDetracciones,
      0
    ),
    cantidadMovimientos: movimientos.length,
  };
}

export function getMonthRange(year: number, month: number): { desde: string; hasta: string } {
  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const hasta = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { desde, hasta };
}
