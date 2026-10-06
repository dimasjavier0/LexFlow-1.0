import { Link } from "react-router-dom";
import type { ApiCollectionSummary } from "../lib/api";

type CollectionCardProps = { collection: ApiCollectionSummary };

export function CollectionCard({ collection }: CollectionCardProps) {
  return <Link className="collection-card" to={`/learn/${collection.slug}`}>
    <div className="collection-card-top">
      {collection.imageUrl ? <img className="collection-thumbnail" src={collection.imageUrl} alt="" /> : <span className="collection-icon">{collection.name.slice(0, 1).toUpperCase()}</span>}
      <span className="card-arrow">↗</span>
    </div>
    <div>
      <p className="card-kicker">COLECCIÓN</p>
      <h2>{collection.name}</h2>
      <p>{collection.description ?? "Colección de vocabulario"}</p>
    </div>
    <span className="card-meta">{collection._count.words} palabras <span>Comenzar</span></span>
  </Link>;
}
