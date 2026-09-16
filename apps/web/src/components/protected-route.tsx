import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <main className="auth-page">Comprobando sesión...</main>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}