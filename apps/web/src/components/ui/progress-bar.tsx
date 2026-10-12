import { cn } from "../../lib/cn";

export type ProgressDetail = { label: string; value: number; tone: "good" | "bad" };

type ProgressBarProps = {
  /** What is being done, e.g. "Buscando imágenes". */
  label: string;
  done: number;
  /** Null (or zero) until the server says how many items there are. */
  total: number | null;
  /** Plural noun for the items being counted, e.g. "palabras". */
  unit: string;
  /** Name of the item that just finished. */
  item?: string;
  /** Running tallies shown under the bar. */
  details?: ProgressDetail[];
  className?: string;
};

/** Progress of an operation that works through several items, with its tallies so far. */
export function ProgressBar({ label, done, total, unit, item, details = [], className }: ProgressBarProps) {
  const isKnown = total !== null && total > 0;
  const percent = isKnown ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className={cn("grid gap-2 rounded-xl border border-line bg-surface px-3.5 py-3 text-xs", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <strong className="min-w-0 text-sm">
          {label}
          {item ? <span className="ml-2 font-normal text-muted">{item}</span> : null}
        </strong>
        <span className="font-semibold text-muted tabular-nums">{isKnown ? `${done} de ${total} ${unit} · ${percent} %` : "Preparando..."}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={isKnown ? total : undefined}
        aria-valuenow={isKnown ? done : undefined}
        aria-valuetext={isKnown ? `${done} de ${total} ${unit}` : "Preparando"}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div className={cn("h-full rounded-full bg-teal transition-[width] duration-300", !isKnown && "w-full animate-pulse opacity-40")} style={isKnown ? { width: `${percent}%` } : undefined} />
      </div>
      {details.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-semibold" aria-live="polite">
          {details.map((detail) => (
            <li key={detail.label} className={detail.tone === "good" ? "text-teal-dark" : "text-warning"}>
              <span aria-hidden="true">{detail.tone === "good" ? "✓" : "⚠"} </span>
              <span className="tabular-nums">{detail.value}</span> {detail.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
