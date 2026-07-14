"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PeriodFilterProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const START_YEAR = 2026;

export function getAvailableYears(): number[] {
  const current = new Date().getFullYear();
  const end = Math.max(current + 2, START_YEAR);
  const years: number[] = [];
  for (let y = START_YEAR; y <= end; y++) years.push(y);
  return years;
}

export default function PeriodFilter({ year, month, onChange }: PeriodFilterProps) {
  const years = getAvailableYears();
  const safeYear = year < START_YEAR ? START_YEAR : year;

  function goPrev() {
    if (month === 1) {
      if (safeYear > START_YEAR) onChange(safeYear - 1, 12);
    } else {
      onChange(safeYear, month - 1);
    }
  }

  function goNext() {
    const lastYear = years[years.length - 1];
    if (month === 12) {
      if (safeYear < lastYear) onChange(safeYear + 1, 1);
    } else {
      onChange(safeYear, month + 1);
    }
  }

  return (
    <div className="inline-flex items-stretch border border-vertex-border bg-white overflow-hidden" style={{ borderRadius: 4 }}>
      <button
        type="button"
        onClick={goPrev}
        aria-label="Mes anterior"
        className="px-2 flex items-center text-vertex-muted hover:bg-vertex-surface border-r border-vertex-border"
      >
        <ChevronLeft size={16} />
      </button>
      <select
        value={month}
        onChange={(e) => onChange(safeYear, parseInt(e.target.value))}
        aria-label="Mes"
        className="px-2 py-1.5 text-sm font-semibold bg-white outline-none cursor-pointer text-vertex-text"
      >
        {MONTHS.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={safeYear}
        onChange={(e) => onChange(parseInt(e.target.value), month)}
        aria-label="Año"
        className="px-2 py-1.5 text-sm font-semibold bg-white outline-none cursor-pointer text-vertex-text border-l border-vertex-border"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={goNext}
        aria-label="Mes siguiente"
        className="px-2 flex items-center text-vertex-muted hover:bg-vertex-surface border-l border-vertex-border"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
