import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/brand-mark";
import { Button, buttonClasses } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { cn } from "../lib/cn";

type AppLayoutProps = {
  children: ReactNode;
  /** Replaces the default brand + session bar. */
  topbar?: ReactNode;
  width?: "wide" | "narrow";
  className?: string;
};

function AppTopbar() {
  const { apiUser, isAuthenticated, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4">
      <BrandMark />
      <nav className="flex items-center gap-2" aria-label="Navegación principal">
        {apiUser?.role === "ADMIN" ? <Link className={buttonClasses({ variant: "secondary", size: "sm" })} to="/admin">Panel admin</Link> : null}
        {isAuthenticated ? (
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>Salir</Button>
        ) : (
          <Link className={buttonClasses({ variant: "ghost", size: "sm" })} to="/login">Iniciar sesión</Link>
        )}
      </nav>
    </header>
  );
}

export function AppLayout({ children, topbar, width = "wide", className }: AppLayoutProps) {
  return (
    <div className={cn("min-h-screen px-4 pt-6 pb-16 sm:px-6", className)}>
      <div className={cn("mx-auto", width === "narrow" ? "max-w-3xl" : "max-w-5xl")}>
        {topbar ?? <AppTopbar />}
        <main>{children}</main>
      </div>
    </div>
  );
}
