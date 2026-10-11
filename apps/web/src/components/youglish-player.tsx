import { useEffect, useRef, useState } from "react";
import type { YouglishAccent } from "../lib/video-sources";
import { loadYouglish, type YouglishWidget } from "../lib/youglish";
import { CarouselControls } from "./media-carousel";
import { Spinner } from "./ui";

type YouglishPlayerProps = {
  /** Word or phrase to hear in context. */
  query: string;
  accent?: YouglishAccent;
  /** Start playing as soon as the first clip is ready. */
  autoStart?: boolean;
  /** Reports how many clips YouGlish has, once known. */
  onResults?: (total: number) => void;
};

type Status = "loading" | "ready" | "empty" | "failed";

let nextWidgetId = 0;

/**
 * Real people saying a word, played live by YouGlish. Its terms do not allow storing the
 * clips, so there is nothing to save beyond the query: every visit fetches them again.
 */
export function YouglishPlayer({ query, accent = "us", autoStart = false, onResults }: YouglishPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<YouglishWidget | null>(null);
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;
  const [status, setStatus] = useState<Status>("loading");
  const [total, setTotal] = useState(0);
  const [track, setTrack] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let isCurrent = true;
    setStatus("loading");
    setTotal(0);
    setTrack(1);

    // The widget replaces its target element, so it gets one React does not manage.
    const targetId = `youglish-${nextWidgetId++}`;
    const target = document.createElement("div");
    target.id = targetId;
    host.replaceChildren(target);

    loadYouglish()
      .then((youglish) => {
        if (!isCurrent) return;
        const widget = new youglish.Widget(targetId, {
          components: 8,
          autoStart: autoStart ? 1 : 0,
          events: {
            onFetchDone: (event) => {
              if (!isCurrent) return;
              setTotal(event.totalResult);
              setStatus(event.totalResult > 0 ? "ready" : "empty");
              onResultsRef.current?.(event.totalResult);
            },
            onVideoChange: (event) => {
              if (isCurrent) setTrack(event.trackNumber);
            },
            onError: () => {
              if (isCurrent) setStatus("failed");
            },
          },
        });
        widgetRef.current = widget;
        widget.fetch(query, "english", accent);
      })
      .catch(() => {
        if (isCurrent) setStatus("failed");
      });

    return () => {
      isCurrent = false;
      widgetRef.current = null;
      // Removing the iframe is what stops playback. The widget's own close() is not used: it
      // looks its element up in the document and throws once React has detached it on unmount.
      host.replaceChildren();
    };
  }, [accent, autoStart, query]);

  // CarouselControls reports the index it wants; the widget only knows "next" and "previous".
  const move = (index: number) => {
    const current = track - 1;
    if (index === (current + 1) % total) widgetRef.current?.next();
    else widgetRef.current?.previous();
  };

  return (
    <div className="grid gap-1.5">
      {/* YouGlish asks for a player of at least 200 × 200 px. */}
      <div ref={hostRef} className={status === "ready" ? "min-h-52 overflow-hidden rounded-xl" : "hidden"} />
      {status === "loading" ? <p className="m-0 flex items-center gap-2 text-[0.82rem] text-muted"><Spinner className="size-4 border-2" /> Cargando YouGlish…</p> : null}
      {status === "empty" ? <p className="m-0 text-[0.82rem] text-muted">YouGlish no tiene clips de “{query}”.</p> : null}
      {status === "failed" ? <p className="m-0 text-[0.82rem] font-semibold text-danger" role="alert">No se pudo cargar YouGlish.</p> : null}
      {status === "ready" ? <CarouselControls index={Math.max(0, track - 1)} count={total} onChange={move} label="Clip" /> : null}
      <a className="justify-self-center text-[0.7rem] text-muted no-underline hover:underline" href="https://youglish.com" target="_blank" rel="noreferrer">Powered by YouGlish.com</a>
    </div>
  );
}
