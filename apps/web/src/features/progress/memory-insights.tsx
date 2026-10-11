import { Link } from "react-router-dom";
import { LineChart } from "../../components/charts/line-chart";
import { buttonClasses } from "../../components/ui";
import type { ReviewLevel } from "../../lib/api";
import { cn } from "../../lib/cn";
import { FIRST_REVIEWS, FORGETTING_CURVE, SOURCES } from "../../lib/learning-science";
import { REVIEW_LEVEL_INFO } from "../../lib/review-exercise";
import { SourceLink } from "./source-link";

type MemoryInsightsProps = {
  /** Words at each review level, lowest first. */
  levels: number[];
  /** Reviews falling on each of the next seven days, today first. */
  upcoming: number[];
  /** Reviews that can be done right now. */
  due: number;
};

/**
 * One hue from light to strong, since the levels are steps of a single scale. Checked with
 * the dataviz palette validator (ordinal) for every tone of the theme, in both modes.
 */
const LEVEL_COLORS = [
  "color-mix(in oklab, var(--color-teal) 62%, var(--color-surface))",
  "color-mix(in oklab, var(--color-teal) 81%, var(--color-surface))",
  "var(--color-teal)",
  "var(--color-teal-dark)",
];

const cardClasses = "grid content-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6";
const weekday = new Intl.DateTimeFormat("es", { weekday: "short" });
const fullDay = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });
const DAY_MS = 24 * 60 * 60 * 1000;

function words(count: number): string {
  return `${count} ${count === 1 ? "palabra" : "palabras"}`;
}

/** How the words being learned are spread over the four review levels. */
function LevelsCard({ levels }: { levels: number[] }) {
  const total = levels.reduce((sum, count) => sum + count, 0);
  return (
    <section className={cardClasses} aria-labelledby="levels-heading">
      <div>
        <h3 id="levels-heading" className="m-0 text-sm font-bold">Tus palabras por nivel de repaso</h3>
        <p className="mt-1 mb-0 text-xs text-muted">Cada acierto seguido sube la palabra un nivel y le quita ayuda. Un fallo la devuelve al primero.</p>
      </div>
      {total ? (
        <div className="flex h-5 gap-0.5" role="img" aria-label={levels.map((count, index) => `Nivel ${index + 1}: ${words(count)}`).join(". ")}>
          {levels.map((count, index) => (count ? (
            <span key={index} title={`Nivel ${index + 1} · ${REVIEW_LEVEL_INFO[(index + 1) as ReviewLevel].name}: ${words(count)}`} className="min-w-1.5 first:rounded-l last:rounded-r" style={{ flexGrow: count, flexBasis: 0, background: LEVEL_COLORS[index] }} />
          ) : null))}
        </div>
      ) : <p className="m-0 rounded-xl bg-paper px-4 py-3 text-sm text-muted">Marca palabras como «Quiero aprender» y las verás avanzar por los cuatro niveles.</p>}
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
        {levels.map((count, index) => {
          const info = REVIEW_LEVEL_INFO[(index + 1) as ReviewLevel];
          return (
            <div key={index} className="grid grid-cols-[auto_1fr] gap-x-2">
              <span aria-hidden="true" className="mt-1 size-2.5 rounded-xs" style={{ background: LEVEL_COLORS[index] }} />
              <dt className="text-xs font-bold">{index + 1} · {info.name}</dt>
              <dd className="col-start-2 m-0 text-xs text-muted"><strong className="text-base font-black text-ink tabular-nums">{count}</strong> · {info.description}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** The review workload of the week ahead, so a heavy day does not come as a surprise. */
function UpcomingCard({ upcoming, due }: { upcoming: number[]; due: number }) {
  const total = upcoming.reduce((sum, count) => sum + count, 0);
  const peak = Math.max(1, ...upcoming);
  const today = Date.now();
  return (
    <section className={cardClasses} aria-labelledby="upcoming-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="upcoming-heading" className="m-0 text-sm font-bold">Repasos de los próximos 7 días</h3>
          <p className="mt-1 mb-0 text-xs text-muted">{total ? `${words(total)} por repasar esta semana.` : "No tienes repasos programados esta semana."}</p>
        </div>
        {due ? <Link className={buttonClasses({ size: "sm" })} to="/review">Repasar {due} ahora</Link> : null}
      </div>
      <ol className="m-0 grid h-36 list-none grid-cols-7 items-end gap-1 p-0" aria-label="Palabras por repasar cada día">
        {upcoming.map((count, index) => {
          const date = new Date(today + index * DAY_MS);
          const isToday = index === 0;
          return (
            <li key={index} className="grid h-full grid-rows-[1fr_auto] justify-items-center gap-1.5" title={`${isToday ? "Hoy" : fullDay.format(date)}: ${words(count)}`}>
              <div className="flex h-full w-full flex-col items-center justify-end gap-1 border-b border-line">
                <span className={cn("text-xs font-extrabold tabular-nums", count ? "text-ink" : "text-muted")}>{count}</span>
                {/* Today is the point of the chart; the other days are its context. */}
                <span className={cn("w-full max-w-6 rounded-t", isToday ? "bg-teal-dark" : "bg-teal/45")} style={{ height: `${(count / peak) * 100}%` }} />
              </div>
              <span className={cn("text-[0.68rem]", isToday ? "font-extrabold text-ink" : "text-muted")}>{isToday ? "Hoy" : weekday.format(date).replace(".", "")}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Why the reviews are spaced the way they are: what is kept of something learned once and never reviewed. */
function ForgettingCard() {
  const lastIndex = FORGETTING_CURVE.length - 1;
  // The hour and the day the text talks about, and where the curve ends.
  const labelled = new Set([2, 4, lastIndex]);
  return (
    <section className={cn(cardClasses, "lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-8")} aria-labelledby="forgetting-heading">
      <div className="grid content-start gap-3 text-sm">
        <h3 id="forgetting-heading" className="m-0 text-sm font-bold">Por qué repasar justo antes de olvidar</h3>
        <p className="m-0 text-muted">
          Lo que se aprende una sola vez se va rápido: sin repasar, en una hora se pierde más de la mitad y en un día, dos tercios (<SourceLink source={SOURCES.ebbinghaus} />).
        </p>
        <p className="m-0 text-muted">
          Dos cosas lo frenan. Repartir los repasos en el tiempo en vez de hacerlos seguidos (<SourceLink source={SOURCES.cepeda} />), y esforzarse por recordar la palabra en lugar de volver a leerla (<SourceLink source={SOURCES.roediger} />).
        </p>
        <p className="m-0 text-muted">
          Por eso LexFlow te vuelve a preguntar cada palabra al día siguiente, a los 6 días y después cada vez más tarde, y en cada nivel te da menos ayuda para escribirla.
        </p>
      </div>
      <div>
        <LineChart
          label="Porcentaje de una lista memorizada que se conserva con el paso del tiempo si no se repasa."
          points={FORGETTING_CURVE.map(({ retained }, index) => ({ x: index, y: retained, label: labelled.has(index) ? `${Math.round(retained)} %` : undefined, isLabelBelow: index !== lastIndex }))}
          x={{ min: 0, max: lastIndex, ticks: FORGETTING_CURVE.map((_, index) => index), format: (value) => FORGETTING_CURVE[value]?.tick ?? "", title: "Tiempo desde que se aprendió" }}
          y={{ min: 0, max: 100, ticks: [0, 25, 50, 75, 100], format: (value) => `${value} %`, title: "Se conserva" }}
          describe={(point) => (point.x === 0 ? "Recién aprendido: 100 %" : `Tras ${FORGETTING_CURVE[point.x].after} sin repasar: queda el ${point.y.toLocaleString("es")} %`)}
          markers={FIRST_REVIEWS.map((review) => ({ x: FORGETTING_CURVE.findIndex((entry) => entry.after === review.after), label: review.label }))}
          hasArea
        />
        <p className="mt-3 mb-0 text-xs text-muted">Curva del olvido de Ebbinghaus, medida con listas de sílabas sin sentido. El eje del tiempo no está a escala.</p>
      </div>
    </section>
  );
}

/** How the learner's words stand in memory, what is coming up, and the research behind the review schedule. */
export function MemoryInsights({ levels, upcoming, due }: MemoryInsightsProps) {
  return (
    <section aria-labelledby="memory-heading">
      <h2 id="memory-heading" className="mb-3 text-xl font-bold tracking-tight">Tu memoria</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <LevelsCard levels={levels} />
        <UpcomingCard upcoming={upcoming} due={due} />
        <ForgettingCard />
      </div>
    </section>
  );
}
