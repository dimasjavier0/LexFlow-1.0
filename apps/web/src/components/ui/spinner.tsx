import { cn } from "../../lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-5 animate-spin rounded-full border-[3px] border-teal-soft border-t-teal", className)} />;
}
