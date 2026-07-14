"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DateInput from "@/components/DateInput";
import { calcularIgv, formatSoles, IGV_RATE } from "@/lib/igv";
import {
  TIPOS_FORMULARIO,
  tipoAplicaIgv,
  type Movimiento,
  type TipoMovimiento,
} from "@/lib/types";
import { Loader2, Paperclip, Save, Search, X } from "lucide-react";

interface MovementFormProps {
  movimiento?: Movimiento;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function MovementForm({
  movimiento,
  onCancel,
  onSuccess,
}: MovementFormProps) {
  const router = useRouter();
  const isEdit = !!movimiento;

  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento?.tipo || "venta");
  const [fecha, setFecha] = useState(
    movimiento?.fecha || new Date().toISOString().split("T")[0]
  );
  const [concepto, setConcepto] = useState(movimiento?.concepto || "");
  const [descripcion, setDescripcion] = useState(movimiento?.descripcion || "");
  const [monto, setMonto] = useState(movimiento?.monto?.toString() || "");
  const [cantidad, setCantidad] = useState(
    movimiento?.cantidad?.toString() || "1"
  );
  const [incluyeIgv, setIncluyeIgv] = useState(movimiento?.incluye_igv ?? true);
  const [comprobanteTipo, setComprobanteTipo] = useState(
    movimiento?.comprobante_tipo || "boleta"
  );
  const [comprobanteNumero, setComprobanteNumero] = useState(
    movimiento?.comprobante_numero || ""
  );
  const [ruc, setRuc] = useState(movimiento?.ruc || "");
  const [razonSocial, setRazonSocial] = useState(movimiento?.razon_social || "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [rucMsg, setRucMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const aplicaIgv = tipoAplicaIgv(tipo);
  const esCompra = tipo === "compra";
  const esVentaFactura =
    tipo === "venta" && comprobanteTipo === "factura";
  const requiereDatosFiscales = esCompra || esVentaFactura;
  const montoNum = parseFloat(monto) || 0;
  const cantidadNum = parseFloat(cantidad) || 0;
  const preview =
    montoNum > 0
      ? calcularIgv(montoNum, aplicaIgv ? incluyeIgv : false, aplicaIgv)
      : null;
  const valorUnitario =
    preview && cantidadNum > 0
      ? Math.round((preview.subtotal / cantidadNum) * 100) / 100
      : null;

  useEffect(() => {
    if (!isEdit) {
      if (tipo === "pago_igv") setConcepto("Pago de IGV");
      else if (tipo === "pago_contador") setConcepto("Pago a contador");
      else if (tipo === "retiro") setConcepto("Retiro de caja");
      else if (tipo === "venta") setConcepto("Venta");
      else if (tipo === "compra") setConcepto("Compra");
    }
  }, [tipo, isEdit]);

  async function consultarRuc(valor?: string) {
    const numero = (valor ?? ruc).replace(/\D/g, "");
    if (numero.length !== 11) {
      setRucMsg("El RUC debe tener 11 dígitos");
      return;
    }

    setBuscandoRuc(true);
    setRucMsg("");
    try {
      const res = await fetch(`/api/ruc?numero=${numero}`);
      const data = await res.json();
      if (!res.ok) {
        setRucMsg(data.error || "No se encontró el RUC");
        return;
      }
      setRazonSocial(data.razon_social || "");
      setRucMsg("Razón social encontrada en SUNAT");
    } catch {
      setRucMsg("Error al consultar. Escribe la razón social manualmente.");
    } finally {
      setBuscandoRuc(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (requiereDatosFiscales && (!/^\d{11}$/.test(ruc) || !razonSocial.trim())) {
        throw new Error(
          esCompra
            ? "En compras debes ingresar RUC y razón social"
            : "En ventas con factura debes ingresar RUC y razón social"
        );
      }
      if (!cantidadNum || cantidadNum <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }

      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("concepto", concepto);
      formData.append("descripcion", descripcion);
      formData.append("monto", monto);
      formData.append("incluye_igv", String(aplicaIgv ? incluyeIgv : false));
      formData.append("fecha", fecha);
      formData.append("cantidad", String(cantidadNum));
      formData.append("comprobante_tipo", comprobanteTipo);
      formData.append("comprobante_numero", comprobanteNumero);
      if (valorUnitario != null) {
        formData.append("valor_unitario", String(valorUnitario));
      }
      if (requiereDatosFiscales) {
        formData.append("ruc", ruc.replace(/\D/g, ""));
        formData.append("razon_social", razonSocial.trim());
      }
      if (archivo) formData.append("documento", archivo);

      const url = isEdit ? `/api/movimientos/${movimiento.id}` : "/api/movimientos";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      onSuccess?.();
      router.refresh();
      if (!onSuccess) router.push("/movimientos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="vertex-label">Tipo de movimiento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimiento)}
            className="vertex-input"
            required
          >
            {TIPOS_FORMULARIO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="vertex-label">Fecha</label>
          <DateInput
            value={fecha}
            onChange={setFecha}
            required
          />
          <p className="text-xs text-vertex-muted mt-1">
            Si eliges un mes pasado, se contabiliza en ese período.
          </p>
        </div>
      </div>

      <div>
        <label className="vertex-label">Concepto</label>
        <input
          type="text"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className="vertex-input"
          placeholder="Ej: Mantenimiento de laptop"
          required
        />
      </div>

      <div>
        <label className="vertex-label">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="vertex-input min-h-[70px] resize-y"
          placeholder="Detalles adicionales..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div>
          <label className="vertex-label">Cantidad</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="vertex-input"
            required
          />
        </div>
        <div className="flex items-end">
          {aplicaIgv ? (
            <label className="flex items-center gap-2 cursor-pointer pb-3">
              <input
                type="checkbox"
                checked={incluyeIgv}
                onChange={(e) => setIncluyeIgv(e.target.checked)}
                className="w-4 h-4 accent-vertex-cyan"
              />
              <span className="text-sm text-vertex-muted">
                Incluye IGV ({IGV_RATE * 100}%)
              </span>
            </label>
          ) : (
            <p className="text-xs text-vertex-muted pb-3">
              Este tipo no calcula IGV adicional.
            </p>
          )}
        </div>
      </div>

      {preview && (
        <div className="rounded-xl border border-vertex-border bg-vertex-surface p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-vertex-muted text-xs">Subtotal</p>
            <p className="font-semibold">{formatSoles(preview.subtotal)}</p>
          </div>
          <div>
            <p className="text-vertex-muted text-xs">IGV</p>
            <p className="font-semibold text-vertex-blue">
              {formatSoles(preview.igv)}
            </p>
          </div>
          <div>
            <p className="text-vertex-muted text-xs">Total</p>
            <p className="font-semibold">{formatSoles(preview.total)}</p>
          </div>
          <div>
            <p className="text-vertex-muted text-xs">V. unitario</p>
            <p className="font-semibold">
              {valorUnitario != null ? formatSoles(valorUnitario) : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="vertex-label">Tipo de documento</label>
          <select
            value={comprobanteTipo}
            onChange={(e) => setComprobanteTipo(e.target.value)}
            className="vertex-input"
          >
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
            <option value="recibo">Recibo</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="vertex-label">Número del documento</label>
          <input
            type="text"
            value={comprobanteNumero}
            onChange={(e) => setComprobanteNumero(e.target.value)}
            className="vertex-input"
            placeholder="Ej: EB01-5 / F001-10"
          />
        </div>
      </div>

      {requiereDatosFiscales && (
        <div className="rounded-xl border border-vertex-border bg-vertex-surface p-4 space-y-3">
          <p className="text-sm font-medium text-vertex-text">
            {esCompra ? "Datos del proveedor" : "Datos del cliente"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="vertex-label">RUC</label>
              <input
                type="text"
                value={ruc}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setRuc(v);
                  if (v.length === 11) consultarRuc(v);
                }}
                className="vertex-input"
                placeholder="11 dígitos"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => consultarRuc()}
                disabled={buscandoRuc}
                className="vertex-btn vertex-btn-secondary w-full sm:w-auto"
              >
                {buscandoRuc ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Consultar
              </button>
            </div>
          </div>
          <div>
            <label className="vertex-label">Razón social</label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className="vertex-input"
              placeholder="Se completa al consultar el RUC"
              required
            />
            {rucMsg && (
              <p className="text-xs text-vertex-muted mt-1">{rucMsg}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="vertex-label">Documento adjunto</label>
        <div className="flex items-center gap-3">
          <label className="vertex-btn vertex-btn-secondary cursor-pointer flex-1">
            <Paperclip size={18} />
            {archivo
              ? archivo.name
              : movimiento?.documento_nombre || "Seleccionar archivo"}
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            />
          </label>
          {archivo && (
            <button
              type="button"
              onClick={() => setArchivo(null)}
              className="p-2 text-vertex-muted hover:text-vertex-danger"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <p className="text-xs text-vertex-muted/70 mt-1">PDF o imagen, máx. 10 MB</p>
      </div>

      {error && <p className="text-vertex-danger text-sm">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="vertex-btn vertex-btn-primary flex-1 disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? "Guardando..." : isEdit ? "Actualizar" : "Registrar movimiento"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="vertex-btn vertex-btn-secondary"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
