import type { ReactNode } from "react";

type AuthLayoutProps = { children: ReactNode };

/** Full-screen centered stage, used by the login panel and status screens. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_12%_12%,var(--color-teal-soft),transparent_25rem)] p-6">
      {children}
    </main>
  );
}
