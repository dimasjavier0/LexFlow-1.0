import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/brand-mark";
import { MediaCarousel } from "../components/media-carousel";
import { StatusPage } from "../components/status-page";
import { Alert, Badge, Button, buttonClasses, Eyebrow, Input } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { errorMessage, useAsyncAction } from "../hooks/use-async-action";
import { AppLayout } from "../layouts/app-layout";
import { getDueReviews, submitReview, type ReviewItem, type ReviewOutcome, type ReviewResult } from "../lib/api";
import { cn } from "../lib/cn";

const SESSION_SIZE = 20;

const backLink = <Link className={buttonClasses({ variant: "secondary" })} to="/">Volver a colecciones</Link>;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function nextReviewLabel(intervalDays: number): string {
  return intervalDays <= 1 ? "Volverá mañana." : `Volverá en ${intervalDays} días.`;
}

type Answered = { result: ReviewResult; outcome: ReviewOutcome };

export function ReviewPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [totalDue, setTotalDue] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [results, setResults] = useState<Answered[]>([]);
  const check = useAsyncAction();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const current = sessionRef.current;
    if (!current) return;
    let isCurrent = true;
    setItems(null);
    setLoadError(null);
    setIndex(0);
    setResults([]);
    setAnswered(null);
    getDueReviews(current, SESSION_SIZE)
      .then((queue) => {
        if (!isCurrent) return;
        setItems(queue.items);
        setTotalDue(queue.total);
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(errorMessage(error, "No se pudieron cargar tus repasos."));
      });
    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const item = items?.[index];

  // Move focus with the flow so the whole review can be done from the keyboard.
  useEffect(() => {
    if (answered) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [answered, item]);

  const grade = useCallback((result: ReviewResult) => {
    if (!session || !item || check.isPending) return;
    void check.run(async () => {
      const outcome = await submitReview(session, item.word.id, result);
      const entry = { result, outcome };
      setAnswered(entry);
      setResults((current) => [...current, entry]);
    }, "No se pudo guardar tu respuesta.");
  }, [check, item, session]);

  if (loadError) return <StatusPage action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>{backLink}</div>}>{loadError}</StatusPage>;
  if (!items) return <StatusPage isLoading>Preparando tu repaso...</StatusPage>;
  if (!items.length) {
    return (
      <StatusPage action={backLink}>
        No tienes palabras pendientes de repaso. Marca palabras como «Quiero aprender» en una colección y aparecerán aquí cuando toque repasarlas.
      </StatusPage>
    );
  }

  const topbar = (
    <header className="flex items-center justify-between gap-4">
      <BrandMark />
      <span className="text-xs font-bold text-muted">{item ? `${index + 1} / ${items.length}` : "Repaso terminado"}</span>
      <Link className="text-sm font-extrabold text-teal-dark no-underline hover:underline" to="/">Salir</Link>
    </header>
  );

  if (!item) {
    const correct = results.filter((entry) => entry.result !== "incorrect").length;
    const mastered = results.filter((entry) => entry.outcome.becameMastered).length;
    const remaining = Math.max(0, totalDue - items.length);
    const points = results.reduce((sum, entry) => sum + entry.outcome.pointsEarned, 0);
    const stats = results.at(-1)?.outcome.stats;
    return (
      <AppLayout width="narrow" topbar={topbar}>
        <section className="mt-14 grid justify-items-center gap-5 rounded-3xl border border-line bg-surface p-6 text-center shadow-lift sm:p-10">
          <Eyebrow>Repaso espaciado</Eyebrow>
          <h1 className="m-0 text-4xl font-bold tracking-tighter sm:text-5xl">¡Repaso completado!</h1>
          <p className="m-0 max-w-sm text-muted">
            Recordaste {correct} de {results.length} {results.length === 1 ? "palabra" : "palabras"}.
            {mastered ? ` ${mastered === 1 ? "Una palabra pasó" : `${mastered} palabras pasaron`} a dominadas.` : ""}
          </p>
          {stats ? (
            <dl className="m-0 grid w-full max-w-md grid-cols-3 gap-2">
              {[
                { label: "Puntos ganados", value: `+${points}` },
                { label: "Nivel", value: stats.level },
                { label: stats.streakCurrent === 1 ? "Día de racha" : "Días de racha", value: stats.streakCurrent },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-teal-soft px-2 py-4 text-teal-dark">
                  <dd className="m-0 text-3xl font-black">{stat.value}</dd>
                  <dt className="mt-1 text-[0.7rem] font-extrabold">{stat.label}</dt>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            {remaining ? <Button onClick={() => setReloadKey((key) => key + 1)}>Seguir repasando ({remaining})</Button> : null}
            <Link className={buttonClasses({ variant: "secondary" })} to="/profile">Ver mi progreso</Link>
            {backLink}
          </div>
        </section>
      </AppLayout>
    );
  }

  const { word } = item;
  const sentence = word.sentences[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim()) return;
    const isRight = normalize(answer) === normalize(word.term);
    // Needing the translation to get there still counts, but as a weaker recall.
    grade(isRight ? (isHintVisible ? "hard" : "correct") : "incorrect");
  };

  const goNext = () => {
    setIndex((current) => current + 1);
    setAnswer("");
    setImageIndex(0);
    setIsHintVisible(false);
    setAnswered(null);
    check.clearError();
  };

  return (
    <AppLayout width="narrow" topbar={topbar}>
      <div className="mt-10 mb-6 text-center">
        <Eyebrow>Repaso espaciado</Eyebrow>
        <h1 className="mt-2 mb-0 text-3xl font-bold tracking-tight sm:text-4xl">{answered ? word.term : "¿Qué palabra es?"}</h1>
      </div>
      <section className="grid gap-4 rounded-3xl border border-line bg-surface p-4 shadow-lift sm:p-7">
        <MediaCarousel items={word.images} index={imageIndex} onChange={setImageIndex} alt={answered ? word.term : "Imagen de la palabra"} />
        <div className="flex justify-center">
          {word.audios[0] ? (
            <audio key={word.id} className="h-10 w-full max-w-sm" controls autoPlay src={word.audios[0].url} aria-label="Pronunciación de la palabra" />
          ) : <span className="text-xs text-muted">Audio no disponible</span>}
        </div>

        {answered ? (
          <>
            <Alert tone={answered.result === "incorrect" ? "error" : "success"}>
              {answered.result === "incorrect" ? `La palabra era “${word.term}”.` : answered.result === "hard" ? "Correcto, con pista." : "¡Correcto!"}{" "}
              {answered.outcome.becameMastered ? "¡Ya la dominas! " : ""}
              {nextReviewLabel(answered.outcome.progress.intervalDays)}
              {answered.outcome.pointsEarned ? ` +${answered.outcome.pointsEarned} puntos.` : ""}
            </Alert>
            <div className="grid gap-1 rounded-2xl bg-paper p-4 text-center">
              <strong className="text-2xl">{word.translationEs}</strong>
              {sentence ? <p className="m-0 text-sm text-muted">{sentence.text}</p> : null}
            </div>
            <Button ref={nextRef} size="lg" onClick={goNext}>{index === items.length - 1 ? "Ver resumen" : "Siguiente"}</Button>
          </>
        ) : (
          <form className="grid gap-3" onSubmit={submit}>
            <Input
              ref={inputRef}
              aria-label="Escribe la palabra en inglés"
              className="py-3.5 text-center text-xl font-bold"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Escribe la palabra en inglés"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            <p className={cn("m-0 rounded-xl bg-paper px-4 py-2.5 text-center text-sm", isHintVisible ? "font-bold text-ink" : "text-muted")}>
              {isHintVisible ? word.translationEs : "Mira la imagen, escucha el audio y escribe lo que oyes."}
            </p>
            {check.error ? <Alert>{check.error} Inténtalo de nuevo.</Alert> : null}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Button type="submit" disabled={!answer.trim()} isLoading={check.isPending} loadingLabel="Comprobando...">Comprobar</Button>
              <Button variant="secondary" disabled={isHintVisible || check.isPending} onClick={() => setIsHintVisible(true)}>Ver pista</Button>
              <Button variant="ghost" disabled={check.isPending} onClick={() => grade("incorrect")}>No la sé</Button>
            </div>
          </form>
        )}
        <div className="flex justify-center gap-2">
          <Badge tone="neutral">{word.level}</Badge>
          <Badge tone={item.stage === "MASTERED" ? "teal" : "neutral"}>{item.stage === "NEW" ? "Nueva" : item.stage === "MASTERED" ? "Dominada" : "Aprendiendo"}</Badge>
        </div>
      </section>
    </AppLayout>
  );
}
