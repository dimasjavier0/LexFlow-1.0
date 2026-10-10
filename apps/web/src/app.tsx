import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/login-page";
import { HomePage } from "./pages/home-page";
import { LearnPage } from "./pages/learn-page";
import { AdminDashboard } from "./components/admin-dashboard";
import { AdminRoute } from "./routes/admin-route";
import { ProtectedRoute } from "./routes/protected-route";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/learn/:collectionSlug" element={<LearnPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
