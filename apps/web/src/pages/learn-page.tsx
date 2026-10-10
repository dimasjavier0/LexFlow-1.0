import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CarouselControls, MediaCarousel } from "../components/media-carousel";
import { StatusPage } from "../components/status-page";
import { Alert, Badge, Button, buttonClasses, Eyebrow, IconButton } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { errorMessage, useAsyncAction } from "../hooks/use-async-action";
import { AppLayout } from "../layouts/app-layout";
import { getCollection, getProgress, updateProgress, type ApiCollection, type LearningStatus } from "../lib/api";
import { cn } from "../lib/cn";
import { isCefrLevel, LEARNING_STATUS_LABELS } from "../lib/levels";

const STATUS_ACTIONS: Array<{ status: LearningStatus; icon: string; className: string }> = [
  { status: "WANT_TO_LEARN", icon: "+", className: "bg-sun/25 text-warning" },
  { status: "NOT_INTERESTED", icon: "–", className: "bg-line/60 text-muted" },
  { status: "LEARNED", icon: "✓", className: "bg-teal-soft text-teal-dark" },
];

const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogv|mov)(\?|#|$)/i;

const backLink = <Link className={buttonClasses({ variant: "secondary" })} to="/">Volver a colecciones</Link>;

export function LearnPage() {
  const { collectionSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const levelParam = searchParams.get("level");
  const level = isCefrLevel(levelParam) ? levelParam : null;
  const { session } = useAuth();
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, LearningStatus>>({});
  const save = useAsyncAction();
  const { clearError: clearSaveError } = save;

  const wordCount = collection?.words.length ?? 0;

  const showWord = useCallback((index: number) => {
    setWordIndex(index);
    setIsFinished(false);
    setIsTranslationVisible(false);
    setImageIndex(0);
    setVideoIndex(0);
    clearSaveError();
  }, [clearSaveError]);

  useEffect(() => {
    let isCurrent = true;
    setCollection(null);
    setLoadError(null);
    showWord(0);
    getCollection(collectionSlug, level)
      .then((loaded) => {
        if (isCurrent) setCollection(loaded);
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(errorMessage(error, "No se pudo cargar la colección."));
      });
    return () => {
      isCurrent = false;
    };
  }, [collectionSlug, level, reloadKey, showWord]);

  useEffect(() => {
    if (!session) return;
    void getProgress(session).then(setProgress).catch(() => undefined);
  }, [session]);

  const moveWord = useCallback((direction: -1 | 1) => {
    const nextIndex = wordIndex + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= wordCount) setIsFinished(true);
    else showWord(nextIndex);
  }, [showWord, wordCount, wordIndex]);

  useEffect(() => {
    if (!wordCount || isFinished) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      // Media elements and form fields use these keys themselves.
      if (target?.closest("input, select, textarea, audio, video")) return;
      if (event.key === "ArrowLeft") moveWord(-1);
      else if (event.key === "ArrowRight") moveWord(1);
      else if (event.key === " " && !target?.closest("button, a")) {
        event.preventDefault();
        setIsTranslationVisible((visible) => !visible);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFinished, moveWord, wordCount]);

  if (loadError) return <StatusPage action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>{backLink}</div>}>{loadError}</StatusPage>;
  if (!collection) return <StatusPage isLoading>Cargando colección...</StatusPage>;

  const currentWord = collection.words[wordIndex]?.word;
  if (!currentWord) return <StatusPage action={backLink}>{level ? `Esta colección no tiene palabras de nivel ${level}.` : "Esta colección aún no tiene palabras publicadas."}</StatusPage>;

  const topbar = (
    <header className="flex items-center justify-between gap-4">
      <Link className="text-sm font-extrabold text-teal-dark no-underline hover:underline" to="/">← Volver</Link>
      <span className="text-xs font-bold text-muted">{isFinished ? "Completada" : `${wordIndex + 1} / ${wordCount}`}</span>
      <Badge>{currentWord.level}</Badge>
    </header>
  );

  if (isFinished) {
    const statuses = collection.words.map(({ word }) => progress[word.id]);
    return (
      <AppLayout width="narrow" topbar={topbar}>
        <section className="mt-14 grid justify-items-center gap-5 rounded-3xl border border-line bg-surface p-6 text-center shadow-lift sm:p-10">
          <Eyebrow>{collection.name}</Eyebrow>
          <h1 className="m-0 text-4xl font-bold tracking-tighter sm:text-5xl">¡Colección completada!</h1>
          <p className="m-0 max-w-sm text-muted">Has recorrido las {wordCount} palabras. Este es tu progreso guardado:</p>
          <dl className="m-0 grid w-full max-w-md grid-cols-3 gap-2">
            {STATUS_ACTIONS.map((action) => (
              <div key={action.status} className={cn("rounded-2xl px-2 py-4", action.className)}>
                <dd className="m-0 text-3xl font-black">{statuses.filter((status) => status === action.status).length}</dd>
                <dt className="mt-1 text-[0.7rem] font-extrabold">{LEARNING_STATUS_LABELS[action.status]}</dt>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => showWord(0)}>Repasar de nuevo</Button>
            {backLink}
          </div>
        </section>
      </AppLayout>
    );
  }

  const saveProgress = (status: LearningStatus) => {
    if (!session || save.isPending) return;
    void save.run(async () => {
      await updateProgress(session, currentWord.id, status);
      setProgress((current) => ({ ...current, [currentWord.id]: status }));
      moveWord(1);
    }, "No se pudo guardar tu progreso.");
  };

  const savedStatus = progress[currentWord.id];
  const currentVideo = currentWord.videos[Math.min(videoIndex, currentWord.videos.length - 1)];

  return (
    <AppLayout width="narrow" topbar={topbar}>
      <div className="mt-12 mb-7 text-center sm:mt-16">
        <Eyebrow>{collection.name}{level ? ` · Nivel ${level}` : ""}</Eyebrow>
        <h1 className="mt-2.5 mb-5 text-[clamp(2.6rem,8vw,4.8rem)] leading-[0.95] font-bold tracking-tighter break-words">{currentWord.term}</h1>
        <div className="mx-auto h-1.5 max-w-64 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Avance en la colección" aria-valuemin={1} aria-valuemax={wordCount} aria-valuenow={wordIndex + 1}>
          <span className="block h-full rounded-full bg-teal transition-[width] duration-200" style={{ width: `${((wordIndex + 1) / wordCount) * 100}%` }} />
        </div>
      </div>
      <section className="rounded-3xl border border-line bg-surface p-4 shadow-lift sm:p-7">
        <MediaCarousel items={currentWord.images} index={imageIndex} onChange={setImageIndex} alt={currentWord.term} />
        <div className="my-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <IconButton label="Palabra anterior" disabled={wordIndex === 0} onClick={() => moveWord(-1)}>←</IconButton>
          <div className="flex min-w-0 justify-center">
            {currentWord.audios[0] ? <audio className="h-10 w-full max-w-sm" controls src={currentWord.audios[0].url} aria-label={`Pronunciación de ${currentWord.term}`} /> : <span className="text-xs text-muted">Audio no disponible</span>}
          </div>
          <IconButton label={wordIndex === wordCount - 1 ? "Terminar colección" : "Palabra siguiente"} onClick={() => moveWord(1)}>→</IconButton>
        </div>
        <button
          type="button"
          aria-pressed={isTranslationVisible}
          onClick={() => setIsTranslationVisible((visible) => !visible)}
          className="grid w-full cursor-pointer gap-1.5 rounded-2xl bg-paper p-4 text-center text-3xl font-black text-ink"
        >
          <span className={cn("transition-[filter] duration-200", !isTranslationVisible && "blur-sm select-none")} aria-hidden={!isTranslationVisible}>{currentWord.translationEs}</span>
          <small className="text-[0.7rem] font-extrabold text-teal-dark">{isTranslationVisible ? "Traducción" : "Toca para descubrir la traducción"}</small>
        </button>
        {currentVideo ? (
          <div className="mt-4 grid gap-1 text-center">
            {VIDEO_FILE_PATTERN.test(currentVideo.url) ? (
              <video key={currentVideo.id} className="aspect-video w-full rounded-2xl bg-ink" controls preload="metadata" src={currentVideo.url} aria-label={`Video de ${currentWord.term}`} />
            ) : (
              <a className="text-sm font-extrabold text-teal-dark no-underline hover:underline" href={currentVideo.url} target="_blank" rel="noreferrer">Ver contexto en video ↗</a>
            )}
            <CarouselControls index={videoIndex} count={currentWord.videos.length} onChange={setVideoIndex} label="Video" />
          </div>
        ) : null}
        {save.error ? <Alert className="mt-4">{save.error} Inténtalo de nuevo.</Alert> : null}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={save.isPending}
              aria-pressed={savedStatus === action.status}
              onClick={() => saveProgress(action.status)}
              className={cn(
                "min-h-13 cursor-pointer rounded-xl px-2 py-2.5 text-[0.72rem] font-extrabold transition disabled:cursor-wait disabled:opacity-55 sm:text-[0.8rem]",
                action.className,
                savedStatus === action.status && "ring-2 ring-current ring-inset",
              )}
            >
              <span aria-hidden="true" className="mr-1.5 text-base">{action.icon}</span>
              {LEARNING_STATUS_LABELS[action.status]}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-0 hidden text-center text-[0.7rem] text-muted sm:block">Atajos: ← → cambian de palabra · Espacio muestra la traducción</p>
      </section>
    </AppLayout>
  );
}
