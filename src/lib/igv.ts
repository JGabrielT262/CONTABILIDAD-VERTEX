/** Tasa de IGV en Perú (18%) */
export const IGV_RATE = 0.18;

export interface CalculoIgv {
  subtotal: number;
  igv: number;
  total: number;
}

export function calcularIgv(
  monto: number,
  incluyeIgv: boolean,
  aplicaIgv = true
): CalculoIgv {
  if (!aplicaIgv) {
    return { subtotal: monto, igv: 0, total: monto };
  }

  if (incluyeIgv) {
    const subtotal = Math.round((monto / (1 + IGV_RATE)) * 100) / 100;
    const igv = Math.round((monto - subtotal) * 100) / 100;
    return { subtotal, igv, total: monto };
  }

  const subtotal = monto;
  const igv = Math.round(subtotal * IGV_RATE * 100) / 100;
  const total = Math.round((subtotal + igv) * 100) / 100;
  return { subtotal, igv, total };
}

export function formatSoles(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}
