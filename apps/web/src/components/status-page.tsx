import type { ReactNode } from "react";

type StatusPageProps = { children: ReactNode };

export function StatusPage({ children }: StatusPageProps) {
  return <main className="status-page">{children}</main>;
}
