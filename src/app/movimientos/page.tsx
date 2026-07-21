import Navbar from "@/components/Navbar";
import MovimientosView from "./MovimientosView";
import { createSupabaseClient, MOVIMIENTOS_TABLE } from "@/lib/supabase";
import {
  calcularResumen,
  getMonthRange,
  perteneceAlMes,
} from "@/lib/resumen";
import { getSessionUser } from "@/lib/auth";
import type { Movimiento } from "@/lib/types";

interface MovimientosPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    tipo?: string;
    nuevo?: string;
  }>;
}

export default async function MovimientosPage({ searchParams }: MovimientosPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = Math.max(
    2026,
    parseInt(params.year || String(Math.max(now.getFullYear(), 2026)))
  );
  const month = parseInt(params.month || String(now.getMonth() + 1));
  const tipo = params.tipo || "";
  const { desde, hasta } = getMonthRange(year, month);
  const periodoKey = `${year}-${String(month).padStart(2, "0")}`;
  const user = await getSessionUser();

  const supabase = createSupabaseClient();

  // Trae el mes por fecha + pagos IGV imputados a este periodo (aunque se pagaron otro mes)
  const [{ data: porFecha }, { data: pagosIgvPeriodo }, { data: todos }] =
    await Promise.all([
      supabase
        .from(MOVIMIENTOS_TABLE)
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from(MOVIMIENTOS_TABLE)
        .select("*")
        .eq("tipo", "pago_igv")
        .eq("periodo_impuesto", periodoKey)
        .order("fecha", { ascending: false }),
      supabase
        .from(MOVIMIENTOS_TABLE)
        .select("tipo,total,igv,origen_fondo"),
    ]);

  const mapa = new Map<string, Movimiento>();
  for (const m of [...(porFecha || []), ...(pagosIgvPeriodo || [])] as Movimiento[]) {
    if (tipo && m.tipo !== tipo) continue;
    // Excluye pago IGV de este listado si su periodo contable es otro mes
    if (!perteneceAlMes(m, desde, hasta)) continue;
    mapa.set(m.id, m);
  }

  const movimientos = Array.from(mapa.values()).sort((a, b) => {
    if (a.fecha === b.fecha) {
      return (b.created_at || "").localeCompare(a.created_at || "");
    }
    return b.fecha.localeCompare(a.fecha);
  });

  const resumen = calcularResumen(movimientos);
  const cajaGlobal = calcularResumen(todos || []);

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <Navbar initialUser={user} />
      <main className="vertex-page space-y-4">
        <MovimientosView
          year={year}
          month={month}
          tipo={tipo}
          balance={resumen.balance}
          cajaNeta={cajaGlobal.cajaNetaDisponible}
          movimientos={movimientos}
          openNuevo={params.nuevo === "1"}
          canCreate={user?.puede_crear ?? false}
          canDelete={user?.puede_borrar ?? false}
        />
      </main>
    </div>
  );
}
