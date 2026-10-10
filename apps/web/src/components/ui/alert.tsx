import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export type AlertTone = "success" | "error" | "info";

const toneClasses: Record<AlertTone, string> = {
  success: "border-teal bg-teal-soft text-teal-dark",
  error: "border-danger bg-danger-soft text-danger",
  info: "border-sun bg-sun-soft text-warning",
};

type AlertProps = { tone?: AlertTone; children: ReactNode; action?: ReactNode; className?: string };

export function Alert({ tone = "error", children, action, className }: AlertProps) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-center justify-between gap-3 rounded-xl border-l-4 px-4 py-3 text-sm font-semibold", toneClasses[tone], className)}>
      <span>{children}</span>
      {action}
    </div>
  );
}
