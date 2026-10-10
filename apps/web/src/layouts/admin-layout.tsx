import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeSwitcher } from "../components/theme-switcher";
import { Badge, Button, buttonClasses, Eyebrow } from "../components/ui";
import { useAuth } from "../contexts/auth-context";

type AdminLayoutProps = { title: string; description: string; children: ReactNode };

export function AdminLayout({ title, description, children }: AdminLayoutProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen px-4 pt-6 pb-24 sm:px-6 sm:pt-10 lg:px-10">
      <div className="mx-auto max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <nav className="flex items-center justify-between gap-3" aria-label="Navegación de administración">
          <Link className={buttonClasses({ variant: "ghost", size: "sm", className: "-ml-3" })} to="/">← Ver la app</Link>
          <div className="flex items-center gap-2">
            <Badge>ADMIN</Badge>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>Salir</Button>
            <ThemeSwitcher />
          </div>
        </nav>
        <header className="mt-6 mb-8">
          <Eyebrow>LexFlow / Admin</Eyebrow>
          <h1 className="mt-2 mb-2 text-[clamp(2rem,5vw,3.5rem)] leading-none font-bold tracking-tighter">{title}</h1>
          <p className="m-0 text-muted">{description}</p>
        </header>
        <main className="grid gap-6">{children}</main>
      </div>
    </div>
  );
}
