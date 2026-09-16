import { Link } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

export function PlaceholderPage({ title }: { title: string }) {
  const { apiUser, isAuthenticated, isSyncingUser, signOut, syncError } = useAuth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-cyan-700">LEXFLOW</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-950">{title}</h1>
        <p className="mt-4 text-slate-600">La experiencia de aprendizaje se construirá aquí.</p>
        {isSyncingUser ? <p className="mt-4 text-slate-500">Sincronizando tu cuenta...</p> : null}
        {apiUser ? <p className="mt-4 text-slate-600">Sesión API: {apiUser.email} ({apiUser.role})</p> : null}
        {syncError ? <p className="mt-4 text-red-700">{syncError}</p> : null}
        {isAuthenticated ? (
          <button className="primary-button" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        ) : (
          <Link className="primary-button inline-block text-center" to="/login">
            Iniciar sesión
          </Link>
        )}
      </section>
    </main>
  );
}
