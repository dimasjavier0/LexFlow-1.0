import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCollections, type ApiCollectionSummary } from "../lib/api";
import { useAuth } from "../contexts/auth-context";

export function HomePage() {
  const { apiUser, isAuthenticated, signOut } = useAuth();
  const [collections, setCollections] = useState<ApiCollectionSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void getCollections().then(setCollections).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las colecciones.");
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow">LEXFLOW</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">Elige una colección</h1>
          <p className="mt-3 text-slate-600">Aprende vocabulario con imagen, audio y contexto.</p>
        </div>
        <div className="flex items-center gap-3">
          {apiUser?.role === "ADMIN" ? <Link className="secondary-button" to="/admin">Panel admin</Link> : null}
          {isAuthenticated ? (
            <button className="secondary-button" onClick={() => void signOut()}>Cerrar sesión</button>
          ) : <Link className="secondary-button" to="/login">Iniciar sesión</Link>}
        </div>
      </header>
      {apiUser ? <p className="mt-6 text-sm text-slate-500">Conectado como {apiUser.email}</p> : null}
      {errorMessage ? <p className="mt-8 text-red-700">{errorMessage}</p> : null}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {collections.map((collection) => (
          <Link className="collection-card" key={collection.id} to={`/learn/${collection.slug}`}>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{collection.name}</h2>
              <p className="mt-2 text-slate-600">{collection.description ?? "Colección de vocabulario"}</p>
            </div>
            <span className="text-sm font-medium text-cyan-700">{collection._count.words} palabras →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}