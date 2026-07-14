"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Save,
  Trash2,
  UserPlus,
  Shield,
  X,
} from "lucide-react";

export interface UsuarioPublico {
  id: string;
  nombre: string;
  puede_crear_movimientos: boolean;
  puede_borrar_movimientos: boolean;
  puede_gestionar_perfiles: boolean;
  activo: boolean;
  created_at: string;
}

interface PerfilesClientProps {
  usuarios: UsuarioPublico[];
  currentUserId: string;
}

export default function PerfilesClient({
  usuarios: initial,
  currentUserId,
}: PerfilesClientProps) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioPublico | null>(null);

  useEffect(() => {
    setUsuarios(initial);
  }, [initial]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-vertex-muted">
          Crea usuarios con su código y define qué pueden hacer.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="vertex-btn vertex-btn-primary"
        >
          <UserPlus size={16} />
          Nuevo usuario
        </button>
      </div>

      <div className="space-y-2">
        {usuarios.map((u) => (
          <div key={u.id} className="vertex-card p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  {u.nombre}
                  {u.puede_gestionar_perfiles && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-vertex-blue font-semibold">
                      <Shield size={12} /> Admin
                    </span>
                  )}
                  {!u.activo && (
                    <span className="text-[10px] uppercase text-vertex-danger">
                      Inactivo
                    </span>
                  )}
                  {u.id === currentUserId && (
                    <span className="text-[10px] text-vertex-muted">(tú)</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                  <PermBadge
                    ok={u.puede_crear_movimientos}
                    label="Crear movimientos"
                  />
                  <PermBadge
                    ok={u.puede_borrar_movimientos}
                    label="Borrar movimientos"
                  />
                  <PermBadge
                    ok={u.puede_gestionar_perfiles}
                    label="Gestionar perfiles"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(u);
                    setOpen(true);
                  }}
                  className="vertex-btn vertex-btn-secondary text-xs px-3 py-1.5"
                >
                  Editar
                </button>
                {u.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 text-vertex-muted hover:text-vertex-danger"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <UsuarioModal
          usuario={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSuccess={() => {
            setOpen(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PermBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 border ${
        ok
          ? "border-green-200 bg-green-50 text-vertex-success"
          : "border-vertex-border bg-vertex-surface text-vertex-muted"
      }`}
      style={{ borderRadius: 4 }}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function UsuarioModal({
  usuario,
  onClose,
  onSuccess,
}: {
  usuario: UsuarioPublico | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!usuario;
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [codigo, setCodigo] = useState("");
  const [activo, setActivo] = useState(usuario?.activo ?? true);
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
      const body: Record<string, unknown> = {
        nombre,
        activo,
      };
      if (!isEdit || codigo) body.codigo = codigo;

      const res = await fetch(
        isEdit ? `/api/usuarios/${usuario.id}` : "/api/usuarios",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
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
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-white border border-vertex-border shadow-2xl"
        style={{ borderRadius: 4 }}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-vertex-border bg-white">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Plus size={16} className="text-vertex-blue" />
              {isEdit ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            <p className="text-[11px] text-vertex-muted">
              El código se guarda encriptado
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
          <div>
            <label className="vertex-label">Nombre</label>
            <input
              className="vertex-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Ana Karla"
              required
            />
          </div>

          <div>
            <label className="vertex-label">
              {isEdit ? "Nuevo código (opcional)" : "Código de acceso"}
            </label>
            <input
              type="password"
              className="vertex-input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder={isEdit ? "Dejar vacío para no cambiar" : "Mínimo 4 caracteres"}
              required={!isEdit}
              minLength={isEdit ? undefined : 4}
            />
          </div>

          <div className="space-y-2 vertex-card p-3 bg-vertex-surface">
            <p className="text-xs font-semibold uppercase tracking-wide text-vertex-muted">
              {usuario?.puede_gestionar_perfiles
                ? "Permisos del administrador"
                : "Permisos fijos del operador"}
            </p>
            {usuario?.puede_gestionar_perfiles ? (
              <p className="text-sm text-vertex-blue">
                Administrador con acceso completo
              </p>
            ) : (
              <>
                <p className="text-sm text-vertex-success">
                  ✓ Puede registrar y subir información
                </p>
                <p className="text-sm text-vertex-muted">
                  ✗ No puede borrar registros
                </p>
                <p className="text-sm text-vertex-muted">
                  ✗ No puede ver ni gestionar Perfiles
                </p>
              </>
            )}
            {isEdit && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="accent-vertex-blue"
                />
                Usuario activo
              </label>
            )}
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
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
