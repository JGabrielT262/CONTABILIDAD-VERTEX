"use client";

import { useRouter } from "next/navigation";
import PeriodFilter from "@/components/PeriodFilter";
import { TIPOS_FORMULARIO, TIPOS_MOVIMIENTO } from "@/lib/types";

interface MovimientosClientProps {
  year: number;
  month: number;
  tipo: string;
}

const FILTRO_TIPOS = [
  ...TIPOS_FORMULARIO,
  ...TIPOS_MOVIMIENTO.filter(
    (t) =>
      t.value === "prestamo_otorgado" ||
      t.value === "cobro_prestamo" ||
      t.value === "prestamo_recibido"
  ),
];

export default function MovimientosClient({
  year,
  month,
  tipo,
}: MovimientosClientProps) {
  const router = useRouter();

  function buildUrl(y: number, m: number, t: string) {
    const params = new URLSearchParams({ year: String(y), month: String(m) });
    if (t) params.set("tipo", t);
    return `/movimientos?${params}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodFilter
        year={year}
        month={month}
        onChange={(y, m) => router.push(buildUrl(y, m, tipo))}
      />
      <select
        value={tipo}
        onChange={(e) => router.push(buildUrl(year, month, e.target.value))}
        className="vertex-input"
        style={{ width: "auto", minWidth: 170 }}
      >
        <option value="">Todos los tipos</option>
        {FILTRO_TIPOS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
