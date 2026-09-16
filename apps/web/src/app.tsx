import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./components/login-page";
import { PlaceholderPage } from "./components/placeholder-page";
import { ProtectedRoute } from "./components/protected-route";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaceholderPage title="LexFlow" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/learn/:collectionSlug" element={<PlaceholderPage title="Aprender" />} />
        <Route path="/admin" element={<PlaceholderPage title="Administración" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
