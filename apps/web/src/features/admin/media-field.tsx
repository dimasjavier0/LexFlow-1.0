import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CarouselControls } from "../../components/media-carousel";
import { Button, Input, Spinner } from "../../components/ui";
import { errorMessage } from "../../hooks/use-async-action";
import { ApiError } from "../../lib/api";

/**
 * Building blocks shared by the media sections of the word forms (sound, video), so they
 * all behave alike: search once typing pauses, step through the results with arrows,
 * preview before keeping, optionally paste a link, and report progress and failures inline.
 */

const SEARCH_DELAY_MS = 600;
const NO_ITEMS: never[] = [];

/** The term to search for: it follows `term` once typing pauses, and clears at once with it. */
export function useDebouncedTerm(term: string): string {
  const [debounced, setDebounced] = useState(() => term.trim());

  useEffect(() => {
    const next = term.trim();
    if (!next) {
      setDebounced("");
      return;
    }
    const timeout = window.setTimeout(() => setDebounced(next), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [term]);

  return debounced;
}

export type MediaSearch<T> =
  | { status: "idle" | "searching" }
  | { status: "done"; items: T[] }
  | { status: "failed"; message: string; canRetry: boolean };

/**
 * Runs `search` again whenever `key` changes; a null key means there is nothing to search yet.
 * Answers that arrive after the key has moved on are ignored.
 */
export function useMediaSearch<T>(key: string | null, search: () => Promise<T[]>): { search: MediaSearch<T>; retry: () => void } {
  const [state, setState] = useState<MediaSearch<T>>({ status: "idle" });
  const [retryKey, setRetryKey] = useState(0);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    if (key === null) {
      setState({ status: "idle" });
      return;
    }
    let isCurrent = true;
    setState({ status: "searching" });
    searchRef.current()
      .then((items) => {
        if (isCurrent) setState({ status: "done", items });
      })
      .catch((error: unknown) => {
        // 503 means the source is not set up on the server: trying again cannot help.
        if (isCurrent) setState({ status: "failed", message: errorMessage(error, "No se pudo buscar."), canRetry: !(error instanceof ApiError && error.status === 503) });
      });
    return () => {
      isCurrent = false;
    };
  }, [key, retryKey]);

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);
  return { search: state, retry };
}

/** Runs one action at a time, exposing which one is in flight (so only its button shows progress) and the last failure. */
export function useBusyRunner() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, action: () => void | Promise<void>, fallback: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught, fallback));
    } finally {
      setBusy(null);
    }
  };

  return { busy, error, run };
}

export type BusyRunner = ReturnType<typeof useBusyRunner>;

type Selection = { id?: string; metadata?: Record<string, unknown> | null };

/**
 * Something picked from a search for a word that was then retyped would be saved with the
 * wrong word, so unsaved picks made for a different term are dropped. Search results carry
 * the term they were found for in `metadata.text`; pasted links do not and are left alone.
 */
export function useDropStaleSelections<T extends Selection>(items: T[], searchTerm: string, onRemove: (item: T) => void | Promise<void>): void {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  useEffect(() => {
    for (const item of itemsRef.current) {
      const pickedFor = typeof item.metadata?.text === "string" ? item.metadata.text.toLowerCase() : null;
      if (!item.id && pickedFor !== null && pickedFor !== searchTerm.toLowerCase()) void onRemoveRef.current(item);
    }
  }, [searchTerm]);
}

export function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[0.82rem] text-muted">{children}</p>;
}

/** Frame of a media section; the last failed action is reported at its foot. */
export function MediaFieldset({ legend, error, children }: { legend: string; error: string | null; children: ReactNode }) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 rounded-xl border border-line p-3.5">
      <legend className="px-1.5 text-xs font-extrabold text-teal-dark">{legend}</legend>
      {children}
      {error ? <p className="m-0 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
    </fieldset>
  );
}

/** Titled block inside a media section, with optional controls next to the title. */
export function MediaSection({ title, controls, children }: { title: string; controls?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-[0.82rem] font-semibold text-muted">{title}</strong>
        {controls}
      </div>
      {children}
    </div>
  );
}

type MediaCarouselProps<T> = {
  search: MediaSearch<T>;
  onRetry: () => void;
  /** Noun for the arrow labels, e.g. "Grabación". */
  label: string;
  texts: { idle: string; searching: string; empty: string };
  /** Preview and actions of the result on screen. */
  children: (item: T, index: number) => ReactNode;
};

/** Shows where a search stands and, once it is done, one result at a time with arrows to reach the rest. */
export function MediaCarousel<T>({ search, onRetry, label, texts, children }: MediaCarouselProps<T>) {
  const items: T[] = search.status === "done" ? search.items : NO_ITEMS;
  const [index, setIndex] = useState(0);
  // A new list of results starts from its first one.
  useEffect(() => setIndex(0), [items]);
  const current = items[Math.min(index, items.length - 1)];

  return (
    <div className="grid gap-2" aria-live="polite">
      {search.status === "idle" ? <Hint>{texts.idle}</Hint> : null}
      {search.status === "searching" ? <p className="m-0 flex items-center gap-2 text-[0.82rem] text-muted"><Spinner className="size-4 border-2" /> {texts.searching}</p> : null}
      {current !== undefined ? (
        <div className="grid gap-1.5">
          {children(current, index)}
          <CarouselControls index={index} count={items.length} onChange={setIndex} label={label} />
        </div>
      ) : null}
      {search.status === "done" && current === undefined ? <Hint>{texts.empty}</Hint> : null}
      {search.status === "failed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-[0.82rem] font-semibold text-danger">{search.message}</p>
          {search.canRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Reintentar</Button> : null}
        </div>
      ) : null}
    </div>
  );
}

type LinkAdderProps = {
  /** Accessible name of the field. */
  label: string;
  placeholder: string;
  /** True when the word already has this link. */
  isTaken: (url: string) => boolean;
  runner: BusyRunner;
  onAdd: (url: string) => void | Promise<void>;
  /** Player for the pasted link, shown once it is a valid URL. */
  renderPreview: (url: string) => ReactNode;
};

/** Optional "paste your own link" row, previewed before it is added. */
export function LinkAdder({ label, placeholder, isTaken, runner, onAdd, renderPreview }: LinkAdderProps) {
  const [link, setLink] = useState("");
  const url = link.trim();
  const isValid = isHttpUrl(url);
  const key = `add:${url}`;

  const add = () => {
    if (!isValid || isTaken(url) || runner.busy) return;
    void runner.run(key, async () => {
      await onAdd(url);
      setLink("");
    }, "No se pudo guardar el enlace.");
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-0 flex-1 basis-56"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          placeholder={placeholder}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            // Enter would otherwise submit the word form around this field.
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
        />
        <Button variant="secondary" size="sm" disabled={!isValid || isTaken(url) || runner.busy !== null} isLoading={runner.busy === key} loadingLabel="Guardando…" onClick={add}>Añadir enlace</Button>
      </div>
      {isValid ? renderPreview(url) : null}
      {url && !isValid ? <Hint>El enlace debe empezar por https://</Hint> : null}
    </div>
  );
}
