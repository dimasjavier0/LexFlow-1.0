import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

const controlClasses =
  "w-full min-w-0 rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm font-normal text-ink placeholder:text-muted/70 focus:border-teal disabled:opacity-60";

type FieldProps = { label: string; hint?: ReactNode; children: ReactNode; className?: string };

/** Label wrapper for a single form control. */
export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cn("grid content-start gap-1.5 text-[0.82rem] font-semibold text-muted", className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "resize-y leading-relaxed", className)} {...props} />;
}
