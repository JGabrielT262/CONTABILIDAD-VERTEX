export type TipoMovimiento =
  | "venta"
  | "compra"
  | "retiro"
  | "pago_igv"
  | "pago_contador"
  | "ingreso"
  | "salida"
  | "prestamo_recibido"
  | "prestamo_otorgado"
  | "cobro_prestamo"
  | "deposito_detraccion"
  | "retiro_detraccion";

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  concepto: string;
  descripcion: string | null;
  source_key: string | null;
  comprobante_tipo: string | null;
  comprobante_numero: string | null;
  ruc: string | null;
  razon_social: string | null;
  item: string | null;
  cantidad: number | null;
  valor_unitario: number | null;
  monto: number;
  incluye_igv: boolean;
  subtotal: number;
  igv: number;
  total: number;
  fecha: string;
  documento_url: string | null;
  documento_nombre: string | null;
  fecha_devolucion: string | null;
  prestamo_id: string | null;
  /** Periodo tributario YYYY-MM (pago IGV) */
  periodo_impuesto: string | null;
  /** De dónde salió el dinero: caja | detracciones */
  origen_fondo: "caja" | "detracciones" | null;
  created_at: string;
  updated_at: string;
}

export type OrigenFondo = "caja" | "detracciones";

export const MESES_LABEL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function labelPeriodoImpuesto(periodo: string | null | undefined): string {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return "";
  const [y, m] = periodo.split("-");
  const mes = MESES_LABEL[parseInt(m, 10) - 1];
  return mes ? `${mes} ${y}` : periodo;
}

export interface ResumenPeriodo {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  totalVentas: number;
  totalCompras: number;
  totalIgvVentas: number;
  totalIgvCompras: number;
  totalPagosIgv: number;
  totalPrestamosRecibidos: number;
  totalPrestamosOtorgados: number;
  igvPendiente: number;
  cajaNetaDisponible: number;
  saldoDetracciones: number;
  cantidadMovimientos: number;
}

/** Tipos disponibles en el formulario de nuevo movimiento */
export const TIPOS_FORMULARIO: {
  value: TipoMovimiento;
  label: string;
  direccion: "ingreso" | "egreso";
  aplicaIgv: boolean;
}[] = [
  { value: "venta", label: "VENTA", direccion: "ingreso", aplicaIgv: true },
  { value: "compra", label: "COMPRA", direccion: "egreso", aplicaIgv: true },
  { value: "retiro", label: "RETIRO", direccion: "egreso", aplicaIgv: false },
  { value: "pago_igv", label: "PAGO IGV", direccion: "egreso", aplicaIgv: false },
  { value: "pago_contador", label: "PAGO CONTADOR", direccion: "egreso", aplicaIgv: false },
  {
    value: "deposito_detraccion",
    label: "A DETRACCIONES",
    direccion: "egreso",
    aplicaIgv: false,
  },
  {
    value: "retiro_detraccion",
    label: "DESDE DETRACCIONES",
    direccion: "ingreso",
    aplicaIgv: false,
  },
];

/** Todos los tipos (incluye préstamos y legacy) para filtros y listados */
export const TIPOS_MOVIMIENTO: {
  value: TipoMovimiento;
  label: string;
  direccion: "ingreso" | "egreso";
}[] = [
  ...TIPOS_FORMULARIO,
  { value: "prestamo_recibido", label: "Préstamo recibido", direccion: "ingreso" },
  { value: "prestamo_otorgado", label: "Préstamo otorgado", direccion: "egreso" },
  { value: "cobro_prestamo", label: "Cobro de préstamo", direccion: "ingreso" },
  { value: "ingreso", label: "Ingreso", direccion: "ingreso" },
  { value: "salida", label: "Salida", direccion: "egreso" },
];

export function esIngreso(tipo: TipoMovimiento): boolean {
  return TIPOS_MOVIMIENTO.find((t) => t.value === tipo)?.direccion === "ingreso";
}

export function tipoAplicaIgv(tipo: TipoMovimiento): boolean {
  return TIPOS_FORMULARIO.find((t) => t.value === tipo)?.aplicaIgv ?? false;
}

export type TipoTarea = "general" | "factura" | "pago" | "otro";
export type EstadoTarea = "pendiente" | "hecha";

export interface Tarea {
  id: string;
  source_key: string | null;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  tipo: TipoTarea;
  monto_usd: number | null;
  ruc: string | null;
  razon_social: string | null;
  estado: EstadoTarea;
  created_at: string;
  updated_at: string;
}
