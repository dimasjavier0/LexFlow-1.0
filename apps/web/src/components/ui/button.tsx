import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-teal-dark text-white hover:bg-teal",
  secondary: "border border-line bg-surface text-teal-dark hover:border-teal hover:bg-teal-soft",
  ghost: "text-teal-dark hover:bg-teal-soft",
  danger: "bg-danger text-white hover:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-12 w-full px-5 py-3 text-base",
};

type ButtonStyle = { variant?: ButtonVariant; size?: ButtonSize; className?: string };

/** Shared button look, also usable on links: `<Link className={buttonClasses()} />`. */
export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyle = {}): string {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-extrabold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & ButtonStyle & { isLoading?: boolean; loadingLabel?: string };

export function Button({ variant, size, className, isLoading = false, loadingLabel, disabled, children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
      {isLoading ? (loadingLabel ?? children) : children}
    </button>
  );
}
