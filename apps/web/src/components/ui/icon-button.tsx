import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> & { label: string; tone?: "default" | "plain" };

export function IconButton({ label, tone = "default", className, type = "button", children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-base leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "default" ? "border border-line bg-surface text-teal-dark hover:border-teal hover:bg-teal-soft" : "text-muted hover:bg-teal-soft hover:text-teal-dark",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
