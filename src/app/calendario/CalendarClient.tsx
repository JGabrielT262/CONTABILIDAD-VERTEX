"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PeriodFilter from "@/components/PeriodFilter";
import DateInput from "@/components/DateInput";
import { formatSoles } from "@/lib/igv";
import type { Movimiento, Tarea } from "@/lib/types";
import { esIngreso } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
  Plus,
  Save,
  Trash2,
  X,
  ListTodo,
} from "lucide-react";

interface DaySummary {
  ingresos: number;
  egresos: number;
  items: Movimiento[];
}

interface CalendarClientProps {
  year: number;
  month: number;
  movimientos: Movimiento[];
  tareas: Tarea[];
  canDelete?: boolean;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarClient({
  year,
  month,
  movimientos,
  tareas,
  canDelete = false,
}: CalendarClientProps) {
  const router = useRouter();
  const [openTarea, setOpenTarea] = useState(false);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;

  const byDay: Record<number, DaySummary> = {};
  let totalIngresos = 0;
  let totalEgresos = 0;
  for (const m of movimientos) {
    const day = parseInt(m.fecha.split("-")[2], 10);
    if (!byDay[day]) byDay[day] = { ingresos: 0, egresos: 0, items: [] };
    byDay[day].items.push(m);
    if (esIngreso(m.tipo)) {
      byDay[day].ingresos += Number(m.total);
      totalIngresos += Number(m.total);
    } else {
      byDay[day].egresos += Number(m.total);
      totalEgresos += Number(m.total);
    }
  }

  const tareasByDay = useMemo(() => {
    const map: Record<number, Tarea[]> = {};
    for (const t of tareas) {
      const day = parseInt(t.fecha.split("-")[2], 10);
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    return map;
  }, [tareas]);

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pendientes = tareas.filter((t) => t.estado === "pendiente");

  async function toggleTarea(t: Tarea) {
    const next = t.estado === "hecha" ? "pendiente" : "hecha";
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    if (res.ok) router.refresh();
  }

  async function deleteTarea(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    const res = await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter
          year={year}
          month={month}
          onChange={(y, m) => router.push(`/calendario?year=${y}&month=${m}`)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vertex-success" />
              <span className="text-vertex-muted">Ingresos</span>
              <span className="font-semibold text-vertex-success">
                {formatSoles(totalIngresos)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vertex-danger" />
              <span className="text-vertex-muted">Gastos</span>
              <span className="font-semibold text-vertex-danger">
                {formatSoles(totalEgresos)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenTarea(true)}
            className="vertex-btn vertex-btn-primary"
          >
            <Plus size={16} />
            Nueva tarea
          </button>
        </div>
      </div>

      <div className="vertex-card overflow-hidden p-0">
        <div className="grid grid-cols-7 bg-vertex-surface border-b border-vertex-border">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-vertex-muted"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const summary = day ? byDay[day] : null;
            const dayTasks = day ? tareasByDay[day] || [] : [];
            const hasData = !!summary && summary.items.length > 0;
            const isToday = isCurrentMonth && day === today.getDate();

            return (
              <div
                key={idx}
                className={`min-h-[76px] sm:min-h-[96px] border-b border-r border-vertex-border p-1.5 flex flex-col gap-1 ${
                  day ? "bg-white" : "bg-vertex-surface/40"
                } ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}`}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center text-[12px] font-semibold ${
                        isToday
                          ? "rounded-full bg-vertex-blue text-white"
                          : hasData || dayTasks.length
                            ? "text-vertex-text"
                            : "text-vertex-muted"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-auto space-y-0.5">
                      {summary && summary.ingresos > 0 && (
                        <div className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-vertex-success leading-tight">
                          +{formatSoles(summary.ingresos)}
                        </div>
                      )}
                      {summary && summary.egresos > 0 && (
                        <div className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-vertex-danger leading-tight">
                          -{formatSoles(summary.egresos)}
                        </div>
                      )}
                      {dayTasks.length > 0 && (
                        <div className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-vertex-blue leading-tight">
                          {dayTasks.length} tarea{dayTasks.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-vertex-muted uppercase tracking-wide flex items-center gap-2">
            <ListTodo size={14} />
            Tareas del mes
          </h2>
          <span className="text-xs text-vertex-muted">
            {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"}
          </span>
        </div>

        {tareas.length === 0 ? (
          <div className="vertex-card p-5 text-sm text-vertex-muted">
            No hay tareas en {MONTHS[month - 1]} {year}. Usa “Nueva tarea” para
            programar facturas o recordatorios.
          </div>
        ) : (
          <div className="space-y-2">
            {tareas.map((t) => (
              <div
                key={t.id}
                className={`vertex-card p-3 flex flex-wrap items-start justify-between gap-3 ${
                  t.estado === "hecha" ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold text-sm ${
                      t.estado === "hecha" ? "line-through" : ""
                    }`}
                  >
                    {t.titulo}
                  </p>
                  <p className="text-xs text-vertex-muted mt-0.5">
                    {String(t.fecha).slice(8, 10)}/{String(t.fecha).slice(5, 7)}/
                    {String(t.fecha).slice(0, 4)}
                    {t.tipo === "factura" ? " · Factura" : ""}
                    {t.monto_usd != null ? ` · USD ${Number(t.monto_usd).toFixed(2)} + IGV` : ""}
                  </p>
                  {(t.ruc || t.razon_social) && (
                    <p className="text-[11px] text-vertex-muted mt-0.5">
                      {t.ruc ? `RUC ${t.ruc}` : ""}
                      {t.razon_social ? ` · ${t.razon_social}` : ""}
                    </p>
                  )}
                  {t.descripcion && (
                    <p className="text-xs text-vertex-muted mt-1">{t.descripcion}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleTarea(t)}
                    className="p-1.5 text-vertex-muted hover:text-vertex-success"
                    title={t.estado === "hecha" ? "Marcar pendiente" : "Marcar hecha"}
                  >
                    {t.estado === "hecha" ? (
                      <CheckCircle2 size={16} className="text-vertex-success" />
                    ) : (
                      <Circle size={16} />
                    )}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteTarea(t.id)}
                      className="p-1.5 text-vertex-muted hover:text-vertex-danger"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-vertex-muted uppercase tracking-wide">
          Detalle por día
        </h2>
        {Object.keys(byDay).length === 0 && (
          <div className="vertex-card p-6 text-center text-sm text-vertex-muted">
            No hay movimientos en {MONTHS[month - 1]} {year}
          </div>
        )}
        {Object.entries(byDay)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([day, summary]) => (
            <div key={day} className="vertex-card p-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-vertex-surface px-3 py-2 border-b border-vertex-border">
                <p className="text-sm font-semibold">
                  {String(day).padStart(2, "0")} {MONTHS[month - 1]}
                </p>
                <div className="flex gap-3 text-xs">
                  {summary.ingresos > 0 && (
                    <span className="text-vertex-success font-medium">
                      +{formatSoles(summary.ingresos)}
                    </span>
                  )}
                  {summary.egresos > 0 && (
                    <span className="text-vertex-danger font-medium">
                      -{formatSoles(summary.egresos)}
                    </span>
                  )}
                </div>
              </div>
              <ul>
                {summary.items.map((m) => (
                  <li
                    key={m.id}
                    className="flex justify-between gap-3 text-sm px-3 py-2 border-b border-vertex-border last:border-b-0"
                  >
                    <span className="text-vertex-text truncate">{m.concepto}</span>
                    <span
                      className={`shrink-0 font-medium ${
                        esIngreso(m.tipo)
                          ? "text-vertex-success"
                          : "text-vertex-danger"
                      }`}
                    >
                      {esIngreso(m.tipo) ? "+" : "-"}
                      {formatSoles(Number(m.total))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>

      {openTarea && (
        <NuevaTareaModal
          year={year}
          month={month}
          onClose={() => setOpenTarea(false)}
          onSuccess={() => {
            setOpenTarea(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function NuevaTareaModal({
  year,
  month,
  onClose,
  onSuccess,
}: {
  year: number;
  month: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [modo, setModo] = useState<"unica" | "fin_mes">("fin_mes");
  const [titulo, setTitulo] = useState("Crear factura USD 750 + IGV");
  const [descripcion, setDescripcion] = useState(
    "Factura sujeta al tipo de cambio del día. Monto: USD 750.00 + IGV."
  );
  const [tipo, setTipo] = useState("factura");
  const [fecha, setFecha] = useState(todayISO());
  const [monthStart, setMonthStart] = useState(month);
  const [yearStart, setYearStart] = useState(year);
  const [monthsCount, setMonthsCount] = useState(4);
  const [montoUsd, setMontoUsd] = useState("750");
  const [ruc, setRuc] = useState("20611393238");
  const [razonSocial, setRazonSocial] = useState(
    "RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          descripcion,
          tipo,
          modo,
          fecha,
          year: yearStart,
          month_start: monthStart,
          months_count: monthsCount,
          monto_usd: montoUsd || null,
          ruc,
          razon_social: razonSocial,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-white shadow-2xl border border-vertex-border"
        style={{ borderRadius: 4 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-vertex-border bg-white">
          <div>
            <h2 className="text-base font-bold">Nueva tarea</h2>
            <p className="text-[11px] text-vertex-muted">
              Una sola fecha o varios fines de mes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-vertex-muted hover:text-vertex-text"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModo("fin_mes")}
              className={`p-3 border text-left text-sm ${
                modo === "fin_mes"
                  ? "border-vertex-blue bg-blue-50"
                  : "border-vertex-border"
              }`}
              style={{ borderRadius: 4 }}
            >
              <p className="font-semibold">Fines de mes</p>
              <p className="text-[11px] text-vertex-muted mt-0.5">
                Varios meses seguidos
              </p>
            </button>
            <button
              type="button"
              onClick={() => setModo("unica")}
              className={`p-3 border text-left text-sm ${
                modo === "unica"
                  ? "border-vertex-blue bg-blue-50"
                  : "border-vertex-border"
              }`}
              style={{ borderRadius: 4 }}
            >
              <p className="font-semibold">Fecha única</p>
              <p className="text-[11px] text-vertex-muted mt-0.5">
                Solo un día
              </p>
            </button>
          </div>

          <div>
            <label className="vertex-label">Título</label>
            <input
              className="vertex-input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="vertex-label">Descripción</label>
            <textarea
              className="vertex-input min-h-[70px] resize-y"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="vertex-label">Tipo</label>
              <select
                className="vertex-input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="factura">Factura</option>
                <option value="pago">Pago</option>
                <option value="general">General</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="vertex-label">Monto USD (opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="vertex-input"
                value={montoUsd}
                onChange={(e) => setMontoUsd(e.target.value)}
                placeholder="750"
              />
            </div>
          </div>

          {modo === "unica" ? (
            <div>
              <label className="vertex-label">Fecha</label>
              <DateInput value={fecha} onChange={setFecha} required />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="vertex-label">Mes inicio</label>
                <select
                  className="vertex-input"
                  value={monthStart}
                  onChange={(e) => setMonthStart(parseInt(e.target.value))}
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="vertex-label">Año</label>
                <input
                  type="number"
                  min={2026}
                  className="vertex-input"
                  value={yearStart}
                  onChange={(e) => setYearStart(parseInt(e.target.value) || 2026)}
                  required
                />
              </div>
              <div>
                <label className="vertex-label">¿Cuántos meses?</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="vertex-input"
                  value={monthsCount}
                  onChange={(e) =>
                    setMonthsCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="vertex-label">RUC (opcional)</label>
              <input
                className="vertex-input"
                value={ruc}
                onChange={(e) =>
                  setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                placeholder="11 dígitos"
              />
            </div>
            <div>
              <label className="vertex-label">Razón social</label>
              <input
                className="vertex-input"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-vertex-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="vertex-btn vertex-btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="vertex-btn vertex-btn-primary flex-1 disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Guardando..." : "Crear tarea(s)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
