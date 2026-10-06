import type { ReactNode } from "react";

type AdminLayoutProps = { children: ReactNode };

export function AdminLayout({ children }: AdminLayoutProps) {
  return <main className="admin-shell">{children}</main>;
}
