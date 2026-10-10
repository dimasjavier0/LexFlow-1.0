import { useCallback, useEffect, useState } from "react";
import { CollectionCard, CollectionCardSkeleton } from "../components/collection-card";
import { Alert, Button, EmptyState, Eyebrow } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { errorMessage } from "../hooks/use-async-action";
import { AppLayout } from "../layouts/app-layout";
import { getCollections, type ApiCollectionSummary } from "../lib/api";

export function HomePage() {
  const { apiUser } = useAuth();
  const [collections, setCollections] = useState<ApiCollectionSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    getCollections()
      .then(setCollections)
      .catch((error: unknown) => setLoadError(errorMessage(error, "No se pudieron cargar las colecciones.")));
  }, []);

  useEffect(load, [load]);

  return (
    <AppLayout className="bg-[radial-gradient(circle_at_88%_10%,rgb(224_243_239/85%),transparent_29rem)]">
      <section className="mx-auto mt-16 mb-9 max-w-2xl sm:mt-24 sm:mb-13 sm:text-center">
        <Eyebrow>Tu ruta de vocabulario</Eyebrow>
        <h1 className="mx-auto mt-3 mb-3.5 max-w-xl text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.98] font-bold tracking-tighter">Aprende una palabra cada vez.</h1>
        <p className="m-0 text-lg text-muted">Descubre vocabulario con imágenes, audio y contexto.</p>
        {apiUser ? <p className="mt-5 text-xs text-muted">Conectado como {apiUser.email}</p> : null}
      </section>
      {loadError ? <Alert className="mb-6" action={<Button variant="secondary" size="sm" onClick={load}>Reintentar</Button>}>{loadError}</Alert> : null}
      <section className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Colecciones de vocabulario" aria-busy={collections === null && !loadError}>
        {collections === null && !loadError ? [0, 1, 2].map((item) => <CollectionCardSkeleton key={item} />) : null}
        {collections?.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
      </section>
      {collections?.length === 0 ? <EmptyState title="Todavía no hay colecciones publicadas" description="Vuelve pronto: estamos preparando el primer vocabulario." /> : null}
    </AppLayout>
  );
}
