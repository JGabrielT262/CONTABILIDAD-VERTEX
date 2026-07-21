"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MovementList from "@/components/MovementList";
import MovimientosClient from "./MovimientosClient";
import MovementModal from "@/components/MovementModal";
import { formatSoles } from "@/lib/igv";
import type { Movimiento } from "@/lib/types";
import { Plus } from "lucide-react";

interface MovimientosViewProps {
  year: number;
  month: number;
  tipo: string;
  balance: number;
  cajaNeta: number;
  igvPendiente: number;
  movimientos: Movimiento[];
  openNuevo?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
}

export default function MovimientosView({
  year,
  month,
  tipo,
  balance,
  cajaNeta,
  igvPendiente,
  movimientos,
  openNuevo = false,
  canCreate = true,
  canDelete = true,
}: MovimientosViewProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(openNuevo && canCreate);

  function closeModal() {
    setModalOpen(false);
    if (openNuevo) {
      router.replace(`/movimientos?year=${year}&month=${month}`);
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-vertex-muted text-xs mt-0.5">
            Caja neta real:{" "}
            <span
              className={
                cajaNeta >= 0 ? "text-vertex-success" : "text-vertex-danger"
              }
            >
              {formatSoles(cajaNeta)}
            </span>
            <span className="text-vertex-muted">
              {" "}
              · IGV pendiente {formatSoles(igvPendiente)} · mes{" "}
              {formatSoles(balance)}
            </span>
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="vertex-btn vertex-btn-primary"
          >
            <Plus size={16} />
            Nuevo movimiento
          </button>
        )}
      </div>

      <MovimientosClient year={year} month={month} tipo={tipo} />

      <MovementList
        movimientos={movimientos}
        onOpenNuevo={canCreate ? () => setModalOpen(true) : undefined}
        canCreate={canCreate}
        canDelete={canDelete}
      />

      {canCreate && (
        <MovementModal open={modalOpen} onClose={closeModal} />
      )}
    </>
  );
}
