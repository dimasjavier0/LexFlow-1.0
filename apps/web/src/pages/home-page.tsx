import { useCallback, useEffect, useState } from "react";
import { CollectionCard, CollectionCardSkeleton } from "../components/collection-card";
import { Alert, Button, buttonClasses, EmptyState, Eyebrow, FilterChips } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { errorMessage } from "../hooks/use-async-action";
import { AppLayout } from "../layouts/app-layout";
import { Link } from "react-router-dom";
import { getCollections, getDueReviews, getProgressSummary, type CollectionCatalog } from "../lib/api";
import { isCefrLevel, type CefrLevel } from "../lib/levels";

const LEVEL_STORAGE_KEY = "lexflow.level";
const ALL_LEVELS = "all";

function readStoredLevel(): CefrLevel | null {
  try {
    const stored = window.localStorage.getItem(LEVEL_STORAGE_KEY);
    return isCefrLevel(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeLevel(level: CefrLevel | null): void {
  try {
    if (level) window.localStorage.setItem(LEVEL_STORAGE_KEY, level);
    else window.localStorage.removeItem(LEVEL_STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the choice just lasts for this visit.
  }
}

export function HomePage() {
  const { apiUser, session } = useAuth();
  const [level, setLevel] = useState<CefrLevel | null>(readStoredLevel);
  const [catalog, setCatalog] = useState<CollectionCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [learnedByCollection, setLearnedByCollection] = useState<Record<string, number> | null>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setLoadError(null);
    getCollections(level)
      .then((loaded) => {
        if (isCurrent) setCatalog(loaded);
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(errorMessage(error, "No se pudieron cargar las colecciones."));
      });
    return () => {
      isCurrent = false;
    };
  }, [level, reloadKey]);

  useEffect(() => {
    let isCurrent = true;
    if (!session) {
      setLearnedByCollection(null);
      return;
    }
    // Optional decoration: without it the cards simply show their word count.
    getProgressSummary(session, level)
      .then((summary) => {
        if (isCurrent) setLearnedByCollection(summary);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [level, session]);

  useEffect(() => {
    let isCurrent = true;
    if (!session) {
      setDueCount(0);
      return;
    }
    getDueReviews(session, 1)
      .then((queue) => {
        if (isCurrent) setDueCount(queue.total);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [session]);

  const chooseLevel = useCallback((value: string) => {
    const next = isCefrLevel(value) ? value : null;
    storeLevel(next);
    setCatalog(null);
    setLevel(next);
  }, []);

  const collections = catalog?.collections ?? null;
  const isLoading = collections === null && !loadError;
  // A selector with a single level would have nothing to choose between.
  const levelOptions = catalog && (catalog.levels.length > 1 || level) ? [{ value: ALL_LEVELS, label: "Todos" }, ...catalog.levels.map((item) => ({ value: item, label: item }))] : null;

  return (
    <AppLayout className="bg-[radial-gradient(circle_at_88%_10%,rgb(224_243_239/85%),transparent_29rem)]">
      <section className="mx-auto mt-16 mb-9 max-w-2xl sm:mt-24 sm:mb-13 sm:text-center">
        <Eyebrow>Tu ruta de vocabulario</Eyebrow>
        <h1 className="mx-auto mt-3 mb-3.5 max-w-xl text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.98] font-bold tracking-tighter">Aprende una palabra cada vez.</h1>
        <p className="m-0 text-lg text-muted">Descubre vocabulario con imágenes, audio y contexto.</p>
        {apiUser ? <p className="mt-5 text-xs text-muted">Conectado como {apiUser.email}</p> : null}
      </section>
      {dueCount ? (
        <Alert tone="info" className="mb-6" action={<Link className={buttonClasses({ size: "sm", className: "shrink-0" })} to="/review">Repasar ahora</Link>}>
          {dueCount === 1 ? "Tienes 1 palabra pendiente de repaso." : `Tienes ${dueCount} palabras pendientes de repaso.`}
        </Alert>
      ) : null}
      {levelOptions ? (
        <div className="mb-5 flex sm:justify-center">
          <FilterChips label="Nivel" options={levelOptions} value={level ?? ALL_LEVELS} onChange={chooseLevel} />
        </div>
      ) : null}
      {loadError ? <Alert className="mb-6" action={<Button variant="secondary" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>}>{loadError}</Alert> : null}
      <section className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Colecciones de vocabulario" aria-busy={isLoading}>
        {isLoading ? [0, 1, 2].map((item) => <CollectionCardSkeleton key={item} />) : null}
        {collections?.map((collection) => <CollectionCard key={collection.id} collection={collection} level={level} learnedCount={learnedByCollection ? (learnedByCollection[collection.id] ?? 0) : undefined} />)}
      </section>
      {collections?.length === 0 ? (
        level ? (
          <EmptyState title={`Todavía no hay colecciones de nivel ${level}`} description="Prueba con otro nivel o mira todo el vocabulario." action={<Button variant="secondary" onClick={() => chooseLevel(ALL_LEVELS)}>Ver todos los niveles</Button>} />
        ) : (
          <EmptyState title="Todavía no hay colecciones publicadas" description="Vuelve pronto: estamos preparando el primer vocabulario." />
        )
      ) : null}
    </AppLayout>
  );
}
