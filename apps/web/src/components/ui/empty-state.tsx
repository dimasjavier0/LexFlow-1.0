import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type EmptyStateProps = { title: string; description?: string; action?: ReactNode; className?: string };

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("grid justify-items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-8 text-center", className)}>
      <strong className="text-sm text-ink">{title}</strong>
      {description ? <p className="m-0 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
