import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DashboardClient from "./DashboardClient";
import MonthlyBars, { KpiBar } from "@/components/MonthlyBars";
import { createSupabaseClient, MOVIMIENTOS_TABLE } from "@/lib/supabase";
import {
  calcularResumen,
  getMonthRange,
  type MovimientoResumen,
} from "@/lib/resumen";
import { formatSoles } from "@/lib/igv";
import { getSessionUser } from "@/lib/auth";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShoppingCart,
  HandCoins,
} from "lucide-react";

interface DashboardPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = Math.max(
    2026,
    parseInt(params.year || String(Math.max(now.getFullYear(), 2026)))
  );
  const month = parseInt(params.month || String(now.getMonth() + 1));
  const supabase = createSupabaseClient();
  const [{ data }, user] = await Promise.all([
    supabase
      .from(MOVIMIENTOS_TABLE)
      .select("tipo,total,igv,fecha")
      .order("fecha", { ascending: false }),
    getSessionUser(),
  ]);
  const todos = (data || []) as (MovimientoResumen & { fecha: string })[];
  const { desde, hasta } = getMonthRange(year, month);
  const movimientos = todos.filter(
    (movimiento) => movimiento.fecha >= desde && movimiento.fecha <= hasta
  );

  const resumen = calcularResumen(movimientos);
  const cajaGlobal = calcularResumen(todos);
  const igvNetoMes = Math.max(resumen.totalIgvVentas - resumen.totalIgvCompras, 0);
  const baseMes = Math.max(resumen.totalIngresos + resumen.totalEgresos, 1);

  const chartData: { label: string; ingresos: number; egresos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let y = year;
    let m = month - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    if (y < 2026) continue;
    const range = getMonthRange(y, m);
    const delMes = todos.filter(
      (mov) => mov.fecha >= range.desde && mov.fecha <= range.hasta
    );
    const r = calcularResumen(delMes);
    chartData.push({
      label: `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}`,
      ingresos: r.totalIngresos,
      egresos: r.totalEgresos,
    });
  }

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <Navbar initialUser={user} />
      <main className="vertex-page space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Resumen</h1>
            <p className="text-vertex-muted text-xs mt-0.5">
              Vista clara de tu caja, el mes y el IGV
            </p>
          </div>
          <DashboardClient year={year} month={month} />
        </div>

        {/* 1. Caja global */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vertex-muted">
            1. Caja de todos los meses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="vertex-caja">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Caja bruta
              </p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">
                {formatSoles(cajaGlobal.totalIngresos)}
              </p>
              <p className="text-xs text-white/80 mt-1.5">
                Todo lo que ha entrado
              </p>
            </div>
            <div className="vertex-caja vertex-caja-gastos">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Gastos totales
              </p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">
                {formatSoles(cajaGlobal.totalEgresos)}
              </p>
              <p className="text-xs text-white/80 mt-1.5">
                Todo lo que ha salido
              </p>
            </div>
            <div className="vertex-caja vertex-caja-neta">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Caja neta disponible
              </p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">
                {formatSoles(cajaGlobal.cajaNetaDisponible)}
              </p>
              <p className="text-xs text-white/80 mt-1.5">
                Lo que puedes usar ahora · IGV pendiente{" "}
                {formatSoles(cajaGlobal.igvPendiente)}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Mes + gráfica */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vertex-muted">
            2. Mes seleccionado · {MONTH_FULL[month - 1]} {year}
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-3">
            <MonthlyBars data={chartData} />

            <div className="vertex-card p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">KPI del mes</h3>
                <p className="text-[11px] text-vertex-muted mt-0.5">
                  Cómo se reparte el dinero de este mes
                </p>
              </div>
              <KpiBar
                label="Ingresos del mes"
                value={resumen.totalIngresos}
                total={baseMes}
                color="green"
              />
              <KpiBar
                label="Gastos del mes"
                value={resumen.totalEgresos}
                total={baseMes}
                color="red"
              />
              <KpiBar
                label="Préstamos (se recuperan)"
                value={resumen.totalPrestamosOtorgados}
                total={Math.max(resumen.totalEgresos, 1)}
                color="blue"
              />
              <div className="pt-2 border-t border-vertex-border">
                <p className="text-xs text-vertex-muted">Resultado del mes</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    resumen.balance >= 0
                      ? "text-vertex-success"
                      : "text-vertex-danger"
                  }`}
                >
                  {formatSoles(resumen.balance)}
                </p>
                <p className="text-[11px] text-vertex-muted mt-0.5">
                  Ingresos − gastos de {MONTH_FULL[month - 1].toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <StatsCard
              title="Ingresos"
              value={formatSoles(resumen.totalIngresos)}
              icon={TrendingUp}
              variant="success"
            />
            <StatsCard
              title="Gastos"
              value={formatSoles(resumen.totalEgresos)}
              icon={TrendingDown}
              variant="danger"
            />
            <StatsCard
              title="Préstamos"
              value={formatSoles(resumen.totalPrestamosOtorgados)}
              subtitle="Se recuperan al cobrar"
              icon={HandCoins}
              variant="info"
            />
            <StatsCard
              title="Resultado"
              value={formatSoles(resumen.balance)}
              subtitle="Ingresos − gastos"
              icon={Wallet}
              variant={resumen.balance >= 0 ? "success" : "danger"}
            />
          </div>
        </section>

        {/* 3. Operación e IGV */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vertex-muted">
            3. Ventas, compras e IGV del mes
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            <StatsCard
              title="Ventas"
              value={formatSoles(resumen.totalVentas)}
              icon={Receipt}
              variant="info"
            />
            <StatsCard
              title="Compras"
              value={formatSoles(resumen.totalCompras)}
              icon={ShoppingCart}
            />
            <StatsCard
              title="IGV neto a pagar"
              value={formatSoles(igvNetoMes)}
              subtitle="IGV ventas − IGV compras"
              icon={Receipt}
              variant="info"
            />
            <StatsCard
              title="IGV de ventas"
              value={formatSoles(resumen.totalIgvVentas)}
              subtitle="Del mes seleccionado"
              icon={Receipt}
              variant="info"
            />
            <StatsCard
              title="IGV de compras"
              value={formatSoles(resumen.totalIgvCompras)}
              subtitle="Crédito fiscal del mes"
              icon={ShoppingCart}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
