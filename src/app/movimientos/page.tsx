import Navbar from "@/components/Navbar";
import MovimientosView from "./MovimientosView";
import { createSupabaseClient, MOVIMIENTOS_TABLE } from "@/lib/supabase";
import { calcularResumen, getMonthRange } from "@/lib/resumen";
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
  const user = await getSessionUser();

  const supabase = createSupabaseClient();
  let query = supabase
    .from(MOVIMIENTOS_TABLE)
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);

  const { data: movimientos } = await query;
  const resumen = calcularResumen(movimientos || []);

  // Saldo real global (todos los meses), para que coincida con el Resumen
  const { data: todos } = await supabase
    .from(MOVIMIENTOS_TABLE)
    .select("tipo,total,igv");
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
          movimientos={(movimientos || []) as Movimiento[]}
          openNuevo={params.nuevo === "1"}
          canCreate={user?.puede_crear ?? false}
          canDelete={user?.puede_borrar ?? false}
        />
      </main>
    </div>
  );
}
