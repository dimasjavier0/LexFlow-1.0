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
  const wordCount = collection._count.words;
  const learned = Math.min(learnedCount ?? 0, wordCount);
  const action = wordCount > 0 && learned === wordCount ? "Repasar" : learned > 0 ? "Continuar" : "Comenzar";

  return (
    <Link
      to={`/learn/${collection.slug}${level ? `?level=${level}` : ""}`}
      className="group grid min-h-56 gap-7 rounded-3xl border border-line bg-surface p-6 text-ink no-underline shadow-card transition duration-200 hover:-translate-y-1 hover:border-teal hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        {collection.imageUrl ? (
          <img className="size-13 rounded-2xl object-cover" src={collection.imageUrl} alt="" />
        ) : (
          <span aria-hidden="true" className="grid size-13 place-items-center rounded-2xl bg-teal-soft text-2xl font-black text-teal-dark">{collection.name.slice(0, 1).toUpperCase()}</span>
        )}
        <span aria-hidden="true" className="text-2xl text-teal transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
      </div>
      <div>
        <Eyebrow className="text-muted">Colección</Eyebrow>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight">{collection.name}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-snug text-muted">{collection.description ?? "Colección de vocabulario"}</p>
      </div>
      <div className="grid gap-2 self-end">
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
    </Link>
  );
}

export function CollectionCardSkeleton() {
  return <div aria-hidden="true" className="min-h-56 animate-pulse rounded-3xl border border-line bg-surface/70" />;
}
