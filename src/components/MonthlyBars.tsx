"use client";

import { formatSoles } from "@/lib/igv";

interface BarItem {
  label: string;
  ingresos: number;
  egresos: number;
}

interface MonthlyBarsProps {
  data: BarItem[];
}

export default function MonthlyBars({ data }: MonthlyBarsProps) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.ingresos, d.egresos])
  );

  return (
    <div className="vertex-card p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold">Ingresos vs gastos</h2>
          <p className="text-[11px] text-vertex-muted mt-0.5">
            Comparación de los últimos meses
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-vertex-success" /> Ingresos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-vertex-danger" /> Gastos
          </span>
        </div>
      </div>

      <div className="flex items-end gap-3 sm:gap-5 h-44">
        {data.map((item) => {
          const hIn = Math.round((item.ingresos / max) * 100);
          const hOut = Math.round((item.egresos / max) * 100);
          return (
            <div
              key={item.label}
              className="flex-1 flex flex-col items-center gap-2 min-w-0"
            >
              <div className="w-full flex items-end justify-center gap-1 h-32">
                <div
                  className="w-[42%] bg-vertex-success/85 min-h-[4px]"
                  style={{ height: `${Math.max(hIn, 2)}%` }}
                  title={`Ingresos ${formatSoles(item.ingresos)}`}
                />
                <div
                  className="w-[42%] bg-vertex-danger/85 min-h-[4px]"
                  style={{ height: `${Math.max(hOut, 2)}%` }}
                  title={`Gastos ${formatSoles(item.egresos)}`}
                />
              </div>
              <p className="text-[11px] font-medium text-vertex-muted truncate w-full text-center">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KpiBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "green" | "red" | "blue";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const bar =
    color === "green"
      ? "bg-vertex-success"
      : color === "red"
        ? "bg-vertex-danger"
        : "bg-vertex-blue";

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs mb-1">
        <span className="text-vertex-muted">{label}</span>
        <span className="font-semibold tabular-nums">
          {formatSoles(value)} · {pct}%
        </span>
      </div>
      <div className="h-2 bg-vertex-surface-2 overflow-hidden" style={{ borderRadius: 2 }}>
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
