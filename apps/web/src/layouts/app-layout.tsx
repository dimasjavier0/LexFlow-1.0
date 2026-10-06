import type { ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
  className?: string;
};

export function AppLayout({ children, className = "" }: AppLayoutProps) {
  return <main className={`app-shell ${className}`.trim()}>{children}</main>;
}
