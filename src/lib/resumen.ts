import { esIngreso, type Movimiento, type ResumenPeriodo } from "./types";

export type MovimientoResumen = Pick<Movimiento, "tipo" | "total" | "igv">;

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

  for (const m of movimientos) {
    const total = Number(m.total);
    const igv = Number(m.igv);

    if (esIngreso(m.tipo)) {
      totalIngresos += total;
      if (m.tipo === "venta") {
        totalVentas += total;
        totalIgvVentas += igv;
      }
    } else {
      totalEgresos += total;
      if (m.tipo === "compra") {
        totalCompras += total;
        totalIgvCompras += igv;
      }
    }

    if (m.tipo === "pago_igv") totalPagosIgv += total;
    if (m.tipo === "prestamo_otorgado") totalPrestamosOtorgados += total;
    if (m.tipo === "deposito_detraccion") totalDepositosDetraccion += total;
    if (m.tipo === "retiro_detraccion") totalRetirosDetraccion += total;
  }

  const balance = totalIngresos - totalEgresos;
  // Referencia tributaria: sí descuenta lo ya pagado
  const igvPendiente = Math.max(
    totalIgvVentas - totalIgvCompras - totalPagosIgv,
    0
  );
  // IGV de ventas/compras (sin restar pagos): al pagar IGV la caja baja
  // el monto completo. Ej: 883.88 − 170 = 713.88
  const igvDeOperacion = Math.max(totalIgvVentas - totalIgvCompras, 0);

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
    cajaNetaDisponible: balance - igvDeOperacion,
    saldoDetracciones: Math.max(
      totalDepositosDetraccion - totalRetirosDetraccion,
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
