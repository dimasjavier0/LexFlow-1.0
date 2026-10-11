import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { StatusPage } from "../components/status-page";

export function AdminRoute() {
  const { apiUser, isSyncingUser } = useAuth();

  if (isSyncingUser) return <StatusPage isLoading>Comprobando permisos...</StatusPage>;
  if (apiUser?.role !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}
