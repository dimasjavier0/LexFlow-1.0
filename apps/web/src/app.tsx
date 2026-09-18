import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./components/login-page";
import { HomePage } from "./components/home-page";
import { LearnPage } from "./components/learn-page";
import { AdminDashboard } from "./components/admin-dashboard";
import { ProtectedRoute } from "./components/protected-route";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/learn/:collectionSlug" element={<LearnPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
