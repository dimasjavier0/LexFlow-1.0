import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type BadgeTone = "teal" | "neutral" | "warning";

const toneClasses: Record<BadgeTone, string> = {
  teal: "bg-teal-soft text-teal-dark",
  neutral: "bg-line/70 text-muted",
  warning: "bg-sun/25 text-warning",
};

export function Badge({ children, tone = "teal", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold tracking-wide whitespace-nowrap", toneClasses[tone], className)}>{children}</span>;
}
