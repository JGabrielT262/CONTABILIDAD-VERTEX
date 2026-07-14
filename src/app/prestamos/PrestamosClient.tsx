"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DateInput from "@/components/DateInput";
import { formatSoles } from "@/lib/igv";
import type { Movimiento } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  HandCoins,
  Save,
  Plus,
  X,
  Banknote,
  Trash2,
  Paperclip,
  Eye,
} from "lucide-react";

export interface PrestamoItem extends Movimiento {
  cobrado: number;
  pendiente: number;
  cobros: Movimiento[];
  estado: "pendiente" | "parcial" | "cobrado";
}

interface PrestamosClientProps {
  prestamos: PrestamoItem[];
  meDeben: number;
  totalPrestado: number;
  totalCobrado: number;
  canDelete?: boolean;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PrestamosClient({
  prestamos,
  meDeben,
  totalPrestado,
  totalCobrado,
  canDelete = false,
}: PrestamosClientProps) {
  const router = useRouter();
  const [openNuevo, setOpenNuevo] = useState(false);
  const [cobrarPrestamo, setCobrarPrestamo] = useState<PrestamoItem | null>(
    null
  );

  const pendientes = useMemo(
    () => prestamos.filter((p) => p.estado !== "cobrado"),
    [prestamos]
  );
  const cobrados = useMemo(
    () => prestamos.filter((p) => p.estado === "cobrado"),
    [prestamos]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          <div className="vertex-card p-3 border-l-4 border-l-vertex-success">
            <p className="text-[11px] uppercase tracking-wide text-vertex-muted">
              Me deben
            </p>
            <p className="text-xl font-bold text-vertex-success mt-0.5 tabular-nums">
              {formatSoles(meDeben)}
            </p>
          </div>
          <div className="vertex-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-vertex-muted">
              Total prestado
            </p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">
              {formatSoles(totalPrestado)}
            </p>
          </div>
          <div className="vertex-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-vertex-muted">
              Total cobrado
            </p>
            <p className="text-xl font-bold text-vertex-blue mt-0.5 tabular-nums">
              {formatSoles(totalCobrado)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenNuevo(true)}
          className="vertex-btn vertex-btn-primary shrink-0"
        >
          <Plus size={16} />
          Nuevo préstamo
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-vertex-muted">
          Pendientes de cobro
        </h2>
        {pendientes.length === 0 ? (
          <div className="vertex-card p-5 text-sm text-vertex-muted">
            Aún no tienes préstamos por cobrar.
          </div>
        ) : (
          pendientes.map((p) => (
            <PrestamoCard
              key={p.id}
              prestamo={p}
              onCobrar={() => setCobrarPrestamo(p)}
              onDeleted={() => router.refresh()}
              canDelete={canDelete}
            />
          ))
        )}
      </section>

      {cobrados.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-vertex-muted">
            Ya cobrados
          </h2>
          {cobrados.map((p) => (
            <PrestamoCard
              key={p.id}
              prestamo={p}
              onDeleted={() => router.refresh()}
              canDelete={canDelete}
            />
          ))}
        </section>
      )}

      {openNuevo && (
        <PrestamoModal
          title="Nuevo préstamo"
          subtitle="Registra a quién le prestas y cuándo debe devolver"
          onClose={() => setOpenNuevo(false)}
        >
          <NuevoPrestamoForm
            onCancel={() => setOpenNuevo(false)}
            onSuccess={() => {
              setOpenNuevo(false);
              router.refresh();
            }}
          />
        </PrestamoModal>
      )}

      {cobrarPrestamo && (
        <PrestamoModal
          title="Cobrar préstamo"
          subtitle={`${cobrarPrestamo.razon_social || cobrarPrestamo.concepto} · Pendiente ${formatSoles(cobrarPrestamo.pendiente)}`}
          onClose={() => setCobrarPrestamo(null)}
        >
          <CobrarPrestamoForm
            prestamo={cobrarPrestamo}
            onCancel={() => setCobrarPrestamo(null)}
            onSuccess={() => {
              setCobrarPrestamo(null);
              router.refresh();
            }}
          />
        </PrestamoModal>
      )}
    </div>
  );
}

function PrestamoCard({
  prestamo,
  onCobrar,
  onDeleted,
  canDelete = false,
}: {
  prestamo: PrestamoItem;
  onCobrar?: () => void;
  onDeleted?: () => void;
  canDelete?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const persona =
    prestamo.razon_social ||
    prestamo.concepto.replace(/^Préstamo a\s+/i, "") ||
    "Sin nombre";

  async function handleDelete() {
    if (!confirm("¿Eliminar este préstamo y sus cobros?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/movimientos/${prestamo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "No se pudo eliminar");
        return;
      }
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="vertex-card p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{persona}</p>
          <p className="text-xs text-vertex-muted mt-0.5">
            Prestado:{" "}
            {format(parseISO(prestamo.fecha), "d MMM yyyy", { locale: es })}
            {prestamo.fecha_devolucion
              ? ` · Devolver: ${format(parseISO(prestamo.fecha_devolucion), "d MMM yyyy", { locale: es })}`
              : ""}
          </p>
          {prestamo.descripcion?.includes("Nota:") && (
            <p className="text-xs text-vertex-muted mt-1">
              {prestamo.descripcion.split("Nota:")[1]?.trim()}
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span>
              Prestado: <strong>{formatSoles(Number(prestamo.total))}</strong>
            </span>
            <span className="text-vertex-blue">
              Cobrado: <strong>{formatSoles(prestamo.cobrado)}</strong>
            </span>
            <span
              className={
                prestamo.pendiente > 0
                  ? "text-vertex-danger"
                  : "text-vertex-success"
              }
            >
              Pendiente: <strong>{formatSoles(prestamo.pendiente)}</strong>
            </span>
          </div>
          {(prestamo.documento_url ||
            prestamo.cobros.some((c) => c.documento_url)) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {prestamo.documento_url && (
                <a
                  href={prestamo.documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 border border-vertex-border bg-white px-2 py-1 text-[11px] font-medium text-vertex-blue hover:bg-vertex-surface"
                  style={{ borderRadius: 4 }}
                >
                  <Eye size={13} />
                  Ver comprobante del préstamo
                </a>
              )}
              {prestamo.cobros
                .filter((c) => c.documento_url)
                .map((c, index) => (
                  <a
                    key={c.id}
                    href={c.documento_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 border border-vertex-border bg-white px-2 py-1 text-[11px] font-medium text-vertex-blue hover:bg-vertex-surface"
                    style={{ borderRadius: 4 }}
                  >
                    <Eye size={13} />
                    Ver comprobante de cobro {index + 1}
                  </a>
                ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCobrar && prestamo.pendiente > 0 && (
            <button
              type="button"
              onClick={onCobrar}
              className="vertex-btn vertex-btn-primary text-xs px-3 py-1.5"
            >
              <Banknote size={14} />
              Cobrar
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-vertex-muted hover:text-vertex-danger disabled:opacity-50"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PrestamoModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
            <h2 className="text-base font-bold flex items-center gap-2">
              <HandCoins size={18} className="text-vertex-blue" />
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-vertex-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-vertex-muted hover:text-vertex-text"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ComprobanteField({
  archivo,
  onChange,
}: {
  archivo: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="vertex-label">Comprobante (opcional)</label>
      <div className="flex items-center gap-2">
        <label className="vertex-btn vertex-btn-secondary cursor-pointer flex-1 min-w-0">
          <Paperclip size={16} className="shrink-0" />
          <span className="truncate">
            {archivo?.name || "Seleccionar PDF o imagen"}
          </span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
        {archivo && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-2 text-vertex-muted hover:text-vertex-danger"
            title="Quitar comprobante"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <p className="text-[11px] text-vertex-muted mt-1">
        PDF o imagen, máximo 10 MB
      </p>
    </div>
  );
}

function NuevoPrestamoForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [persona, setPersona] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [fechaDevolucion, setFechaDevolucion] = useState(todayISO());
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("persona", persona);
      formData.append("monto", monto);
      formData.append("fecha", fecha);
      formData.append("fecha_devolucion", fechaDevolucion);
      formData.append("nota", nota);
      if (archivo) formData.append("documento", archivo);

      const res = await fetch("/api/prestamos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="vertex-label">¿A quién le prestas?</label>
        <input
          type="text"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          className="vertex-input"
          placeholder="Nombre de la persona"
          required
        />
      </div>

      <div>
        <label className="vertex-label">Monto (S/)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="vertex-input"
          placeholder="0.00"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="vertex-label">Fecha del préstamo</label>
          <DateInput
            value={fecha}
            onChange={setFecha}
            required
          />
        </div>
        <div>
          <label className="vertex-label">Fecha de devolución</label>
          <DateInput
            value={fechaDevolucion}
            onChange={setFechaDevolucion}
            required
          />
        </div>
      </div>

      <div>
        <label className="vertex-label">Nota (opcional)</label>
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="vertex-input"
          placeholder="Motivo, plazo, etc."
        />
      </div>

      <ComprobanteField archivo={archivo} onChange={setArchivo} />

      {error && <p className="text-vertex-danger text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
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
          {loading ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}

function CobrarPrestamoForm({
  prestamo,
  onCancel,
  onSuccess,
}: {
  prestamo: PrestamoItem;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [monto, setMonto] = useState(String(prestamo.pendiente));
  const [fecha, setFecha] = useState(todayISO());
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("monto", monto);
      formData.append("fecha", fecha);
      formData.append("nota", nota);
      if (archivo) formData.append("documento", archivo);

      const res = await fetch(`/api/prestamos/${prestamo.id}/cobrar`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cobrar");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cobrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="vertex-card p-3 bg-vertex-surface text-sm">
        <p>
          Prestado: <strong>{formatSoles(Number(prestamo.total))}</strong>
        </p>
        <p>
          Ya cobrado: <strong>{formatSoles(prestamo.cobrado)}</strong>
        </p>
        <p>
          Pendiente:{" "}
          <strong className="text-vertex-danger">
            {formatSoles(prestamo.pendiente)}
          </strong>
        </p>
      </div>

      <div>
        <label className="vertex-label">Monto a cobrar (S/)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={prestamo.pendiente}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="vertex-input"
          required
        />
      </div>

      <div>
        <label className="vertex-label">Fecha de cobro</label>
        <DateInput
          value={fecha}
          onChange={setFecha}
          required
        />
      </div>

      <div>
        <label className="vertex-label">Nota (opcional)</label>
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="vertex-input"
          placeholder="Pago parcial, efectivo, etc."
        />
      </div>

      <ComprobanteField archivo={archivo} onChange={setArchivo} />

      {error && <p className="text-vertex-danger text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="vertex-btn vertex-btn-secondary flex-1"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="vertex-btn vertex-btn-primary flex-1 disabled:opacity-50"
        >
          <Banknote size={16} />
          {loading ? "Guardando..." : "Registrar cobro"}
        </button>
      </div>
    </form>
  );
}
