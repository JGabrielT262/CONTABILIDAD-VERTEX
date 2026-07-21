"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatSoles } from "@/lib/igv";
import {
  esIngreso,
  labelPeriodoImpuesto,
  TIPOS_MOVIMIENTO,
  type Movimiento,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Trash2,
  Upload,
  Loader2,
  Eye,
  Download,
  X,
} from "lucide-react";
import Link from "next/link";

interface MovementListProps {
  movimientos: Movimiento[];
  onDelete?: (id: string) => void;
  onUpdated?: () => void;
  onOpenNuevo?: () => void;
  canCreate?: boolean;
  canDelete?: boolean;
}

const TIPO_LABELS = Object.fromEntries(
  TIPOS_MOVIMIENTO.map((t) => [t.value, t.label])
);

const COMPROBANTE_LABELS: Record<string, string> = {
  factura: "Factura",
  boleta: "Boleta",
  recibo: "Recibo",
  nota_credito: "Nota de crédito",
  nota_debito: "Nota de débito",
  ticket: "Ticket",
  otro: "Otro",
};

function labelComprobante(tipo: string | null | undefined): string {
  if (!tipo) return "";
  return COMPROBANTE_LABELS[tipo.toLowerCase()] || tipo;
}

function isPdf(url: string, nombre?: string | null): boolean {
  const source = `${nombre || ""} ${url}`.toLowerCase();
  return source.includes(".pdf") || source.includes("application/pdf");
}

export default function MovementList({
  movimientos,
  onDelete,
  onUpdated,
  onOpenNuevo,
  canCreate = true,
  canDelete = true,
}: MovementListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Movimiento | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!viewer) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewer(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/movimientos/${id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(id);
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpload(id: string, file: File) {
    setUploading(id);
    try {
      const formData = new FormData();
      formData.append("documento", file);
      formData.append("solo_documento", "true");

      const res = await fetch(`/api/movimientos/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "No se pudo subir el documento");
        return;
      }

      onUpdated?.();
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  if (movimientos.length === 0) {
    return (
      <div className="vertex-card p-6 text-center">
        <p className="text-vertex-muted text-sm">No hay movimientos en este período</p>
        {canCreate && onOpenNuevo ? (
          <button
            type="button"
            onClick={onOpenNuevo}
            className="vertex-btn vertex-btn-primary mt-3"
          >
            Registrar primer movimiento
          </button>
        ) : canCreate ? (
          <Link
            href="/movimientos?nuevo=1"
            className="vertex-btn vertex-btn-primary mt-3 inline-flex"
          >
            Registrar primer movimiento
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="vertex-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-vertex-surface border-b border-vertex-border text-left text-[11px] uppercase tracking-wide text-vertex-muted">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Concepto</th>
                <th className="px-3 py-2 font-semibold hidden md:table-cell">Documento</th>
                <th className="px-3 py-2 font-semibold text-right">Total</th>
                <th className="px-3 py-2 font-semibold text-right w-44">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => {
                const ingreso = esIngreso(m.tipo);
                const tipoDoc = labelComprobante(m.comprobante_tipo);
                const tieneDoc = Boolean(m.documento_url);
                const muestraDatosFiscales =
                  m.tipo === "compra" ||
                  (m.tipo === "venta" &&
                    m.comprobante_tipo?.toLowerCase() === "factura");

                return (
                  <tr
                    key={m.id}
                    className="border-b border-vertex-border last:border-0 hover:bg-vertex-surface/70"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-vertex-muted">
                      {format(parseISO(m.fecha), "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-[11px] font-semibold uppercase text-vertex-muted">
                        {TIPO_LABELS[m.tipo] || m.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 min-w-[180px]">
                      <p className="font-medium text-vertex-text leading-snug">
                        {m.concepto}
                      </p>
                      <p className="text-[11px] text-vertex-muted mt-0.5">
                        {m.cantidad ? `Cant. ${m.cantidad}` : ""}
                        {m.igv > 0 ? ` · IGV ${formatSoles(m.igv)}` : ""}
                      </p>
                      {m.tipo === "pago_igv" && (
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Periodo{" "}
                          {labelPeriodoImpuesto(m.periodo_impuesto) || "—"}
                          {" · "}
                          {m.origen_fondo === "detracciones"
                            ? "Desde detracciones"
                            : "Desde caja"}
                        </p>
                      )}
                      {muestraDatosFiscales && (
                        <p className="text-[11px] text-vertex-muted mt-0.5">
                          {m.ruc ? `RUC ${m.ruc}` : "RUC no registrado"}
                          {" · "}
                          {m.razon_social || "Razón social no registrada"}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell text-vertex-muted whitespace-nowrap">
                      {tipoDoc || m.comprobante_numero ? (
                        <div className="leading-tight">
                          {tipoDoc ? (
                            <p className="text-[11px] font-semibold uppercase text-vertex-text">
                              {tipoDoc}
                            </p>
                          ) : null}
                          <p className="text-xs">{m.comprobante_numero || "—"}</p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap ${
                        ingreso ? "text-vertex-success" : "text-vertex-danger"
                      }`}
                    >
                      {ingreso ? "+" : "-"}
                      {formatSoles(Number(m.total))}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {!tieneDoc && canCreate && (
                          <>
                            <input
                              ref={(el) => {
                                fileRefs.current[m.id] = el;
                              }}
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(m.id, file);
                                e.target.value = "";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => fileRefs.current[m.id]?.click()}
                              disabled={uploading === m.id}
                              className="p-1.5 text-vertex-muted hover:text-vertex-blue disabled:opacity-50"
                              title="Subir documento"
                            >
                              {uploading === m.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )}
                            </button>
                          </>
                        )}

                        {tieneDoc && (
                          <button
                            type="button"
                            onClick={() => setViewer(m)}
                            className="inline-flex items-center gap-1 border border-vertex-border bg-white px-2 py-1 text-[11px] font-medium text-vertex-blue hover:bg-vertex-surface"
                            style={{ borderRadius: 4 }}
                            title="Ver documento"
                          >
                            <Eye size={13} />
                            Ver documento
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            disabled={deleting === m.id}
                            className="p-1.5 text-vertex-muted hover:text-vertex-danger disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewer?.documento_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewer(null)}
        >
          <div
            className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl border border-vertex-border"
            style={{ borderRadius: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-vertex-border px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {viewer.documento_nombre || "Documento adjunto"}
                </p>
                <p className="text-xs text-vertex-muted truncate">
                  {labelComprobante(viewer.comprobante_tipo)}
                  {viewer.comprobante_numero
                    ? ` · ${viewer.comprobante_numero}`
                    : ""}
                  {viewer.concepto ? ` · ${viewer.concepto}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={viewer.documento_url}
                  download={viewer.documento_nombre || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vertex-btn vertex-btn-secondary text-xs px-3 py-1.5"
                >
                  <Download size={14} />
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setViewer(null)}
                  className="p-1.5 text-vertex-muted hover:text-vertex-text"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-vertex-surface p-3 min-h-[50vh]">
              {isPdf(viewer.documento_url, viewer.documento_nombre) ? (
                <iframe
                  src={viewer.documento_url}
                  title={viewer.documento_nombre || "Documento"}
                  className="w-full h-[70vh] bg-white border border-vertex-border"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewer.documento_url}
                  alt={viewer.documento_nombre || "Documento"}
                  className="max-w-full max-h-[70vh] mx-auto object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
