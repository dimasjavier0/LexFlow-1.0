import { Navigate, Route, Routes } from "react-router-dom";
import { PlaceholderPage } from "./components/placeholder-page";

export function App() {
  return <Routes><Route path="/" element={<PlaceholderPage title="LexFlow" />} /><Route path="/login" element={<PlaceholderPage title="Iniciar sesión" />} /><Route path="/learn/:collectionSlug" element={<PlaceholderPage title="Aprender" />} /><Route path="/admin" element={<PlaceholderPage title="Administración" />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
