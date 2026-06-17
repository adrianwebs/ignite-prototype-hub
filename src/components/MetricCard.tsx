import { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "optimo" | "moderado" | "riesgo";
  icon?: ReactNode;
}) {
  const toneStyle =
    tone === "optimo"
      ? "text-[color:var(--success)]"
      : tone === "moderado"
        ? "text-[color:var(--warning)]"
        : tone === "riesgo"
          ? "text-[color:var(--danger)]"
          : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${toneStyle}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
