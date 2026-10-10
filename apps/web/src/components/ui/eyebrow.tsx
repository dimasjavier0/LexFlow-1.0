import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("m-0 text-[0.68rem] font-black tracking-[0.16em] text-teal-dark uppercase", className)}>{children}</p>;
}
