"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import MovementForm from "./MovementForm";

interface MovementModalProps {
  open: boolean;
  onClose: () => void;
}

export default function MovementModal({ open, onClose }: MovementModalProps) {
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto bg-white shadow-2xl border border-vertex-border" style={{ borderRadius: 4 }}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-vertex-border bg-white">
          <div>
            <h2 className="text-base font-bold text-vertex-text">Nuevo movimiento</h2>
            <p className="text-[11px] text-vertex-muted">
              Se registra en el período de la fecha elegida
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-vertex-muted hover:bg-vertex-surface hover:text-vertex-text"
            style={{ borderRadius: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <MovementForm onCancel={onClose} onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
}
