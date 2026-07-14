import Navbar from "@/components/Navbar";
import CalendarClient, { type CalendarMovimiento } from "./CalendarClient";
import { createSupabaseClient, MOVIMIENTOS_TABLE, TAREAS_TABLE } from "@/lib/supabase";
import { getMonthRange } from "@/lib/resumen";
import { calcularResumen } from "@/lib/resumen";
import { formatSoles } from "@/lib/igv";
import { getSessionUser } from "@/lib/auth";
import type { Tarea } from "@/lib/types";

interface CalendarioPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function CalendarioPage({ searchParams }: CalendarioPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = Math.max(
    2026,
    parseInt(params.year || String(Math.max(now.getFullYear(), 2026)))
  );
  const month = parseInt(params.month || String(now.getMonth() + 1));
  const { desde, hasta } = getMonthRange(year, month);
  const user = await getSessionUser();

  const supabase = createSupabaseClient();
  const [{ data: movimientos }, { data: tareas }] = await Promise.all([
    supabase
      .from(MOVIMIENTOS_TABLE)
      .select("id,fecha,tipo,concepto,total,igv")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true }),
    supabase
      .from(TAREAS_TABLE)
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true }),
  ]);

  const resumen = calcularResumen(movimientos || []);

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <Navbar initialUser={user} />
      <main className="vertex-page space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Calendario</h1>
            <p className="text-vertex-muted text-xs mt-0.5">
              Movimientos y tareas futuras ·{" "}
              <span className="text-vertex-success">
                +{formatSoles(resumen.totalIngresos)}
              </span>
              {" / "}
              <span className="text-vertex-danger">
                -{formatSoles(resumen.totalEgresos)}
              </span>
            </p>
          </div>
        </div>

        <CalendarClient
          year={year}
          month={month}
          movimientos={(movimientos || []) as CalendarMovimiento[]}
          tareas={(tareas || []) as Tarea[]}
          canDelete={user?.puede_borrar ?? false}
        />
      </main>
    </div>
  );
}
