import { Link } from "react-router-dom";
import type { ApiCollectionSummary } from "../lib/api";
import { Eyebrow } from "./ui";

type CollectionCardProps = { collection: ApiCollectionSummary };

export function CollectionCard({ collection }: CollectionCardProps) {
  const wordCount = collection._count.words;

  return (
    <Link
      to={`/learn/${collection.slug}`}
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
      <span className="flex justify-between self-end text-xs font-bold text-muted">
        {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
        <span className="text-teal-dark">Comenzar</span>
      </span>
    </Link>
  );
}

export function CollectionCardSkeleton() {
  return <div aria-hidden="true" className="min-h-56 animate-pulse rounded-3xl border border-line bg-surface/70" />;
}
