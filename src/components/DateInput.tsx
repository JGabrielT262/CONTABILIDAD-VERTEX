"use client";

import { useEffect, useState } from "react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

function isoToPeruDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function peruDateToIso(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  const isValid =
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day);

  return isValid ? `${year}-${month}-${day}` : null;
}

function maskDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DateInput({
  value,
  onChange,
  className = "vertex-input",
  required,
}: DateInputProps) {
  const [display, setDisplay] = useState(isoToPeruDate(value));

  useEffect(() => {
    setDisplay(isoToPeruDate(value));
  }, [value]);

  function commit(nextDisplay: string) {
    const iso = peruDateToIso(nextDisplay);
    if (iso) onChange(iso);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const next = maskDate(e.target.value);
        setDisplay(next);
        if (next.length === 10) commit(next);
      }}
      onBlur={() => {
        const iso = peruDateToIso(display);
        if (iso) onChange(iso);
        else setDisplay(isoToPeruDate(value));
      }}
      className={className}
      placeholder="DD/MM/AAAA"
      required={required}
    />
  );
}
