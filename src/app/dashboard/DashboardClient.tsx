"use client";

import { useRouter } from "next/navigation";
import PeriodFilter from "@/components/PeriodFilter";

interface DashboardClientProps {
  year: number;
  month: number;
}

export default function DashboardClient({ year, month }: DashboardClientProps) {
  const router = useRouter();

  function handleChange(y: number, m: number) {
    router.push(`/dashboard?year=${y}&month=${m}`);
  }

  return <PeriodFilter year={year} month={month} onChange={handleChange} />;
}
