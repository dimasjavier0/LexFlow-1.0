import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApiCollectionSummary } from "../lib/api";
import type { CefrLevel } from "../lib/levels";
import { Eyebrow } from "./ui";

type CollectionCardProps = {
  collection: ApiCollectionSummary;
  /** Level the learner is browsing; carried into the lesson. */
  level?: CefrLevel | null;
  /** Words of this collection the learner has marked as learned; omit when signed out. */
  learnedCount?: number;
};

export function CollectionCard({ collection, level = null, learnedCount }: CollectionCardProps) {
  // A picture that no longer loads gives way to the initial instead of a broken image.
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const wordCount = collection._count.words;
  const learned = Math.min(learnedCount ?? 0, wordCount);
  const action = wordCount > 0 && learned === wordCount ? "Repasar" : learned > 0 ? "Continuar" : "Comenzar";
  const image = hasImageFailed ? null : collection.imageUrl;

  return (
    <Link
      to={`/learn/${collection.slug}${level ? `?level=${level}` : ""}`}
      className="group grid min-h-80 grid-rows-[minmax(10rem,1fr)_auto] overflow-hidden rounded-3xl border border-line bg-surface text-ink no-underline shadow-card transition duration-200 hover:-translate-y-1 hover:border-teal hover:shadow-lift"
    >
      {/* The picture is the backdrop of the upper half and fades into the card below it. */}
      <div className="relative overflow-hidden bg-teal-soft">
        {image ? (
          <img className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" src={image} alt="" loading="lazy" onError={() => setHasImageFailed(true)} />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-8xl font-black text-teal-dark/30">{collection.name.slice(0, 1).toUpperCase()}</span>
        )}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-surface to-transparent" />
        <span aria-hidden="true" className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-surface/90 text-xl text-teal-dark shadow-card transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
      </div>
      <div className="grid gap-4 px-6 pb-6">
        <div>
          <Eyebrow className="text-muted">Colección</Eyebrow>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight">{collection.name}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-muted">{collection.description ?? "Colección de vocabulario"}</p>
        </div>
        <div className="grid gap-2">
          {learnedCount !== undefined && wordCount > 0 ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Palabras aprendidas de ${collection.name}`} aria-valuemin={0} aria-valuemax={wordCount} aria-valuenow={learned}>
              <span className="block h-full rounded-full bg-teal" style={{ width: `${(learned / wordCount) * 100}%` }} />
            </div>
          ) : null}
          <span className="flex justify-between text-xs font-bold text-muted">
            {learnedCount !== undefined && wordCount > 0 ? `${learned} de ${wordCount} aprendidas` : `${wordCount} ${wordCount === 1 ? "palabra" : "palabras"}`}
            <span className="text-teal-dark">{action}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CollectionCardSkeleton() {
  return <div aria-hidden="true" className="min-h-80 animate-pulse rounded-3xl border border-line bg-surface/70" />;
}
