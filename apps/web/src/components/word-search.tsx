import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchWords, type WordSearchResult } from "../lib/api";
import { Badge, Input } from "./ui";

const DEBOUNCE_MS = 200;

/** Prefix search over published words; each result opens its lesson on that word. */
export function WordSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WordSearchResult[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const term = query.trim();

  useEffect(() => {
    if (!term) {
      setResults(null);
      setHasFailed(false);
      return;
    }
    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      searchWords(term)
        .then((found) => {
          if (!isCurrent) return;
          setResults(found);
          setHasFailed(false);
        })
        .catch(() => {
          if (isCurrent) setHasFailed(true);
        });
    }, DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [term]);

  return (
    <search className="relative mx-auto w-full max-w-md">
      <Input
        type="search"
        aria-label="Buscar una palabra en inglés"
        placeholder="Buscar una palabra en inglés…"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
        }}
        className="rounded-full px-5 py-3 shadow-card"
      />
      {term && (results || hasFailed) ? (
        <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-lift" aria-live="polite">
          {hasFailed ? <p className="m-0 px-4 py-3 text-sm text-danger">No se pudo buscar. Inténtalo de nuevo.</p> : null}
          {!hasFailed && results?.length === 0 ? <p className="m-0 px-4 py-3 text-sm text-muted">Ninguna palabra empieza por “{term}”.</p> : null}
          {!hasFailed && results?.length ? (
            <ul className="m-0 list-none p-1.5">
              {results.map((result) => (
                <li key={result.id}>
                  <Link to={`/learn/${result.collection.slug}?word=${result.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-ink no-underline hover:bg-teal-soft/60">
                    <strong className="min-w-0 flex-1 truncate">{result.term}</strong>
                    <small className="truncate text-xs text-muted">{result.collection.name}</small>
                    <Badge tone="neutral">{result.level}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </search>
  );
}
