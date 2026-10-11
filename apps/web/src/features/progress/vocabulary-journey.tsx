import { LineChart } from "../../components/charts/line-chart";
import { cn } from "../../lib/cn";
import { COVERAGE_THRESHOLDS, SOURCES, TEXT_COVERAGE, VOCABULARY_MILESTONES } from "../../lib/learning-science";
import { SourceLink } from "./source-link";

type VocabularyJourneyProps = {
  /** Words the learner knows: marked as learned or mastered in review. */
  known: number;
  /** Words still on their way through the reviews. */
  inProgress: number;
};

// Spanish writes four-digit numbers without a separator ("9000"), which is what "es" does.
const count = new Intl.NumberFormat("es");
const percent = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const LAST_MILESTONE = VOCABULARY_MILESTONES[VOCABULARY_MILESTONES.length - 1];

/** Same-ramp meter: the track is the soft step of the accent the fill uses. */
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const share = Math.min(1, value / max);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-teal-soft" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
      {/* Even one word leaves a visible mark. */}
      <span className={cn("block h-full rounded-full bg-teal", value > 0 && "min-w-1.5")} style={{ width: `${share * 100}%` }} />
    </div>
  );
}

/**
 * Sets the learner's vocabulary against what research says each stage of English takes:
 * how much of a text a vocabulary size covers, and the sizes worth aiming for.
 */
export function VocabularyJourney({ known, inProgress }: VocabularyJourneyProps) {
  const next = VOCABULARY_MILESTONES.find((milestone) => known < milestone.words);

  return (
    <section aria-labelledby="journey-heading">
      <h2 id="journey-heading" className="mb-1 text-xl font-bold tracking-tight">Tu vocabulario frente al que necesitas</h2>
      <p className="mt-0 mb-3 max-w-3xl text-sm text-muted">
        No hace falta saber todas las palabras del inglés. Unas pocas hacen casi todo el trabajo: con las 1000 familias más frecuentes ya reconoces 8 de cada 10 palabras de un texto.
      </p>

      <div className="grid gap-6 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <div className="grid gap-2">
            <p className="m-0 flex flex-wrap items-baseline gap-x-2.5">
              <strong className="text-5xl leading-none font-black tracking-tight">{count.format(known)}</strong>
              <span className="text-sm font-bold">{known === 1 ? "palabra aprendida" : "palabras aprendidas"}</span>
              {inProgress ? <span className="text-sm text-muted">y {count.format(inProgress)} en camino</span> : null}
            </p>
            {next ? (
              <>
                <Meter value={known} max={next.words} label={`Avance hacia ${count.format(next.words)} palabras`} />
                <p className="m-0 text-xs text-muted">
                  Siguiente hito: <strong className="text-ink">{count.format(next.words)} palabras</strong>. Te faltan {count.format(next.words - known)}.
                </p>
              </>
            ) : <p className="m-0 text-xs text-muted">Has superado todos los hitos: tu vocabulario alcanza para leer sin diccionario.</p>}
          </div>

          <div>
            <h3 className="mt-0 mb-2 text-sm font-bold">Cuánto de un texto reconoces según las palabras que sabes</h3>
            <LineChart
              label="Porcentaje de las palabras de una novela que resultan conocidas según el número de familias de palabras que se saben."
              points={TEXT_COVERAGE.map(({ words, coverage }, index) => ({ x: words, y: coverage, label: index === TEXT_COVERAGE.length - 1 ? `${percent.format(coverage)} %` : undefined }))}
              x={{ min: 0, max: LAST_MILESTONE.words, ticks: [1000, 3000, 5000, 7000, 9000], format: (value) => count.format(value), title: "Familias de palabras conocidas" }}
              y={{ min: 80, max: 100, ticks: [80, 85, 90, 95, 100], format: (value) => `${percent.format(value)} %`, title: "Palabras del texto reconocidas" }}
              describe={(point) => `${count.format(point.x)} palabras: reconoces el ${point.y.toLocaleString("es", { maximumFractionDigits: 1 })} % del texto`}
              thresholds={COVERAGE_THRESHOLDS.map((threshold) => ({ y: threshold.coverage, label: threshold.label }))}
              markers={[{ x: Math.min(known, LAST_MILESTONE.words), label: `Tú: ${count.format(known)}` }]}
            />
            <p className="mt-3 mb-0 text-xs text-muted">
              Con el 95 % te topas con una palabra desconocida de cada 20 y lees con ayuda; con el 98 %, una de cada 50, y lees con comodidad.
            </p>
          </div>
        </div>

        <div className="grid content-start gap-3">
          <h3 className="m-0 text-sm font-bold">Hitos de vocabulario</h3>
          <ol className="m-0 grid list-none gap-2.5 p-0">
            {VOCABULARY_MILESTONES.map((milestone) => {
              const isReached = known >= milestone.words;
              return (
                <li key={milestone.words} className={cn("grid gap-1.5 rounded-xl border p-3", milestone === next ? "border-teal bg-teal-soft/40" : "border-line")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <strong className="text-sm">{count.format(milestone.words)} · {milestone.title}</strong>
                    <span className="shrink-0 text-xs font-bold text-muted tabular-nums">{isReached ? "✓ Conseguido" : `${count.format(known)} / ${count.format(milestone.words)}`}</span>
                  </div>
                  <p className="m-0 text-xs text-muted">{milestone.detail}</p>
                  <Meter value={known} max={milestone.words} label={`Avance hacia ${count.format(milestone.words)} palabras`} />
                </li>
              );
            })}
          </ol>
        </div>

        <p className="m-0 text-xs text-muted lg:col-span-2">
          Datos de <SourceLink source={SOURCES.nation} />, que cuenta familias de palabras (<i lang="en" translate="no">run, runs, running</i> son una) ordenadas por frecuencia. Tu cifra son las palabras que has aprendido en LexFlow: tómala como una aproximación.
        </p>
      </div>
    </section>
  );
}
