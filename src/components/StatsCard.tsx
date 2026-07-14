import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "info";
}

const VARIANTS = {
  default: "text-vertex-text",
  success: "text-vertex-success",
  danger: "text-vertex-danger",
  info: "text-vertex-blue",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: StatsCardProps) {
  return (
    <div className="vertex-card p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[11px] uppercase tracking-wide text-vertex-muted font-semibold">
          {title}
        </p>
        <Icon size={14} className="text-vertex-muted shrink-0" />
      </div>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${VARIANTS[variant]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-vertex-muted text-[11px] mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
