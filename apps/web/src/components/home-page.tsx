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
    <main className="app-shell home-shell">
      <header className="topbar">
        <Link className="brand-mark" to="/" aria-label="LexFlow inicio"><span className="brand-dot" />LEXFLOW</Link>
        <nav className="topbar-actions" aria-label="Navegación principal">
          {apiUser?.role === "ADMIN" ? <Link className="icon-button" to="/admin" title="Panel admin" aria-label="Panel admin">+</Link> : null}
          {isAuthenticated ? <button className="text-button" onClick={() => void signOut()}>Salir</button> : <Link className="text-button" to="/login">Iniciar sesión</Link>}
        </nav>
      </header>
      <section className="home-intro">
        <p className="eyebrow">TU RUTA DE VOCABULARIO</p>
        <h1>Aprende una palabra cada vez.</h1>
        <p>Descubre vocabulario con imágenes, audio y contexto.</p>
        {apiUser ? <span className="user-note">Conectado como {apiUser.email}</span> : null}
      </section>
      {errorMessage ? <p className="error-message page-message">{errorMessage}</p> : null}
      <section className="collection-grid" aria-label="Colecciones de vocabulario">
        {collections.map((collection) => (
          <Link className="collection-card" key={collection.id} to={`/learn/${collection.slug}`}>
            <div className="collection-card-top"><span className="collection-icon">{collection.name.slice(0, 1).toUpperCase()}</span><span className="card-arrow">↗</span></div>
            <div>
              <p className="card-kicker">COLECCIÓN</p>
              <h2>{collection.name}</h2>
              <p>{collection.description ?? "Colección de vocabulario"}</p>
            </div>
            <span className="card-meta">{collection._count.words} palabras <span>Comenzar</span></span>
          </Link>
        ))}
        {!collections.length && !errorMessage ? <p className="empty-state">Todavía no hay colecciones publicadas.</p> : null}
      </section>
    </main>
  );
}