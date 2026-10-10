import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { AuthLayout } from "../layouts/auth-layout";

export function AdminRoute() {
  const { apiUser, isSyncingUser } = useAuth();

  if (isSyncingUser) return <AuthLayout>Comprobando permisos...</AuthLayout>;
  if (apiUser?.role !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}
