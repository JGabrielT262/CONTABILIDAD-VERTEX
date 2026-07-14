import Navbar from "@/components/Navbar";
import PrestamosClient, { type PrestamoItem } from "./PrestamosClient";
import { createSupabaseClient, MOVIMIENTOS_TABLE } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import type { Movimiento } from "@/lib/types";

export default async function PrestamosPage() {
  const user = await getSessionUser();
  const supabase = createSupabaseClient();

  const [{ data: otorgados }, { data: cobros }] = await Promise.all([
    supabase
      .from(MOVIMIENTOS_TABLE)
      .select("*")
      .eq("tipo", "prestamo_otorgado")
      .order("fecha", { ascending: false }),
    supabase
      .from(MOVIMIENTOS_TABLE)
      .select("*")
      .eq("tipo", "cobro_prestamo")
      .order("fecha", { ascending: false }),
  ]);

  const cobradoPorPrestamo = new Map<string, number>();
  const cobrosPorPrestamo = new Map<string, Movimiento[]>();
  for (const cobro of (cobros || []) as Movimiento[]) {
    if (!cobro.prestamo_id) continue;
    const prev = cobradoPorPrestamo.get(cobro.prestamo_id) || 0;
    cobradoPorPrestamo.set(cobro.prestamo_id, prev + Number(cobro.total));
    const lista = cobrosPorPrestamo.get(cobro.prestamo_id) || [];
    lista.push(cobro);
    cobrosPorPrestamo.set(cobro.prestamo_id, lista);
  }

  const prestamos: PrestamoItem[] = ((otorgados || []) as Movimiento[]).map(
    (p) => {
      const total = Number(p.total);
      const cobrado = cobradoPorPrestamo.get(p.id) || 0;
      const pendiente = Math.max(total - cobrado, 0);
      return {
        ...p,
        cobrado,
        pendiente,
        cobros: cobrosPorPrestamo.get(p.id) || [],
        estado:
          pendiente <= 0.009
            ? "cobrado"
            : cobrado > 0
              ? "parcial"
              : "pendiente",
      };
    }
  );

  const meDeben = prestamos.reduce((sum, p) => sum + p.pendiente, 0);
  const totalPrestado = prestamos.reduce((sum, p) => sum + Number(p.total), 0);
  const totalCobrado = prestamos.reduce((sum, p) => sum + p.cobrado, 0);

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <Navbar />
      <main className="vertex-page space-y-4 max-w-4xl">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Préstamos</h1>
          <p className="text-vertex-muted text-xs mt-0.5">
            Registra lo que prestas y cobra cuando te lo devuelvan
          </p>
        </div>

        <PrestamosClient
          prestamos={prestamos}
          meDeben={meDeben}
          totalPrestado={totalPrestado}
          totalCobrado={totalCobrado}
          canDelete={user?.puede_borrar ?? false}
        />
      </main>
    </div>
  );
}
