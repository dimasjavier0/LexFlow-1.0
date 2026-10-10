import type { ReactNode } from "react";
import { AuthLayout } from "../layouts/auth-layout";
import { Spinner } from "./ui";

type StatusPageProps = { children: ReactNode; isLoading?: boolean; action?: ReactNode };

/** Full-screen loading, empty or error message. */
export function StatusPage({ children, isLoading = false, action }: StatusPageProps) {
  return (
    <AuthLayout>
      <div className="grid max-w-sm justify-items-center gap-4 text-center text-muted" role="status">
        {isLoading ? <Spinner /> : null}
        <p className="m-0">{children}</p>
        {action}
      </div>
    </AuthLayout>
  );
}
