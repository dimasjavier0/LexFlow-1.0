import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { videoPlayback, type WordVideo } from "../lib/video-sources";
import { YouglishPlayer } from "./youglish-player";

type VideoPlayerProps = {
  video: WordVideo;
  /** Word the video belongs to, for accessible names. */
  term: string;
  className?: string;
};

const FRAME_CLASSES = "aspect-video w-full rounded-xl bg-black";
const COVER_CLASSES = cn(FRAME_CLASSES, "group relative grid cursor-pointer place-items-center overflow-hidden text-white");

/** What stands in for a video that has not been loaded: its poster under a caption. */
function Cover({ label, hint, poster }: { label: string; hint: string; poster: string | null }) {
  return (
    <>
      {poster ? <img className="absolute inset-0 size-full object-cover opacity-70 transition-opacity group-hover:opacity-90" src={poster} alt="" loading="lazy" /> : null}
      <span className="relative grid justify-items-center gap-1.5 rounded-xl bg-black/55 px-4 py-2.5 text-sm font-extrabold">
        <span aria-hidden="true" className="text-2xl leading-none">▶</span>
        {label}
        <small className="text-[0.7rem] font-semibold opacity-80">{hint}</small>
      </span>
    </>
  );
}

/** Third-party players are only loaded once asked for: nothing external runs until the click. */
function ClickToLoad({ label, hint, poster, className, children }: { label: string; hint: string; poster: string | null; className?: string; children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  if (isLoaded) return <>{children}</>;
  return (
    <button type="button" onClick={() => setIsLoaded(true)} className={cn(COVER_CLASSES, className)}>
      <Cover label={label} hint={hint} poster={poster} />
    </button>
  );
}

/**
 * Plays any video a word can have: a media file, a YouTube or Dailymotion embed, or
 * YouGlish's live clips. Anything else, or a provider that cannot be embedded, is offered as a link.
 */
export function VideoPlayer({ video, term, className }: VideoPlayerProps) {
  const playback = videoPlayback(video);

  if (playback.kind === "file") {
    // With a poster there is no need to fetch anything until the learner presses play.
    return <video className={cn(FRAME_CLASSES, className)} controls preload={playback.poster ? "none" : "metadata"} poster={playback.poster ?? undefined} src={playback.src} aria-label={`Video de ${term}`} />;
  }
  if (playback.kind === "embed") {
    return (
      <ClickToLoad key={playback.src} label="Ver video" hint={playback.site} poster={playback.poster} className={className}>
        <iframe
          className={cn(FRAME_CLASSES, className)}
          src={playback.src}
          title={`Video de ${term} en ${playback.site}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </ClickToLoad>
    );
  }
  if (playback.kind === "youglish") {
    return (
      <ClickToLoad key={`${playback.query}|${playback.accent}`} label="Escuchar en contexto real" hint="YouGlish" poster={null} className={className}>
        <YouglishPlayer query={playback.query} accent={playback.accent} autoStart />
      </ClickToLoad>
    );
  }
  if (playback.site) {
    return (
      <a className={cn(COVER_CLASSES, "no-underline", className)} href={playback.href} target="_blank" rel="noreferrer" aria-label={`Ver video de ${term} en ${playback.site}, en una pestaña nueva`}>
        <Cover label={`Ver en ${playback.site} ↗`} hint="Se abre en otra pestaña" poster={playback.poster} />
      </a>
    );
  }
  return <a className="text-sm font-extrabold text-teal-dark no-underline hover:underline" href={playback.href} target="_blank" rel="noreferrer">Ver video de “{term}” ↗</a>;
}
