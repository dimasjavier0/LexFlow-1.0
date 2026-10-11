import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "../../lib/cn";

type Axis = {
  min: number;
  max: number;
  /** Values that get a label (and, on the vertical axis, a gridline). */
  ticks: number[];
  format: (value: number) => string;
  /** What the axis measures, used as a column heading of the data table. */
  title: string;
};

export type LinePoint = {
  x: number;
  y: number;
  /** Shown above the point at all times. Keep these few: the axes and the tooltip carry the rest. */
  label?: string;
  /** Puts the label under the point, for where the line comes down from above it. */
  isLabelBelow?: boolean;
};

type LineChartProps = {
  /** What the chart shows, for assistive technology. The data follows it as a table. */
  label: string;
  points: LinePoint[];
  x: Axis;
  y: Axis;
  /** Text of the tooltip of a point. */
  describe: (point: LinePoint) => string;
  /** Horizontal reference lines, named at their left end. */
  thresholds?: Array<{ y: number; label: string }>;
  /** Vertical marks, named above the plot. */
  markers?: Array<{ x: number; label: string }>;
  /** Wash under the line. Only honest when the vertical axis starts at zero. */
  hasArea?: boolean;
  className?: string;
};

const percent = (value: number, axis: Axis) => ((value - axis.min) / (axis.max - axis.min)) * 100;

/** Keeps a label centred on its position inside the plot, and against the edge near one. */
function anchor(left: number): string {
  return left < 12 ? "translate-x-0" : left > 88 ? "-translate-x-full" : "-translate-x-1/2";
}

/**
 * A single line over two numeric axes. Only the line itself is SVG, stretched to the plot;
 * everything else is positioned HTML, so text keeps its size at any width.
 */
export function LineChart({ label, points, x, y, describe, thresholds = [], markers = [], hasArea = false, className }: LineChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const placed = points.map((point) => ({ ...point, left: percent(point.x, x), top: 100 - percent(point.y, y) }));
  const line = placed.map((point, index) => `${index ? "L" : "M"}${point.left} ${point.top}`).join(" ");
  const activePoint = active === null ? null : placed[active];

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const left = ((event.clientX - box.left) / box.width) * 100;
    setActive(placed.reduce((nearest, point, index) => (Math.abs(point.left - left) < Math.abs(placed[nearest].left - left) ? index : nearest), 0));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((current) => Math.min(placed.length - 1, Math.max(0, (current ?? (step > 0 ? -1 : placed.length)) + step)));
  };

  return (
    <figure className={cn("m-0", className)}>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 text-[0.68rem] text-muted">
        <div />
        <div className="relative h-5" aria-hidden="true">
          {markers.map((marker) => {
            const left = percent(marker.x, x);
            return <span key={marker.label} className={cn("absolute bottom-0.5 font-extrabold whitespace-nowrap text-ink", anchor(left))} style={{ left: `${left}%` }}>{marker.label}</span>;
          })}
        </div>

        <div className="relative h-52 w-8 tabular-nums" aria-hidden="true">
          {y.ticks.map((tick) => <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - percent(tick, y)}%` }}>{y.format(tick)}</span>)}
        </div>
        <div
          className="relative h-52 touch-pan-y rounded-sm"
          role="group"
          tabIndex={0}
          aria-label={`${label} Usa las flechas izquierda y derecha para recorrer los puntos.`}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {y.ticks.map((tick) => <span key={tick} aria-hidden="true" className="absolute inset-x-0 border-t border-line" style={{ top: `${100 - percent(tick, y)}%` }} />)}
          {thresholds.map((threshold) => (
            <span key={threshold.label} aria-hidden="true" className="absolute inset-x-0 border-t border-muted/60" style={{ top: `${100 - percent(threshold.y, y)}%` }}>
              <span className="absolute bottom-0.5 left-1 font-extrabold whitespace-nowrap text-ink">{threshold.label}</span>
            </span>
          ))}
          {markers.map((marker) => <span key={marker.label} aria-hidden="true" className="absolute inset-y-0 border-l-2 border-coral" style={{ left: `${percent(marker.x, x)}%` }} />)}
          {activePoint ? <span aria-hidden="true" className="absolute inset-y-0 border-l border-muted/50" style={{ left: `${activePoint.left}%` }} /> : null}

          <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {hasArea && placed.length ? <path d={`${line} L${placed[placed.length - 1].left} 100 L${placed[0].left} 100 Z`} fill="var(--color-teal)" opacity="0.1" /> : null}
            <path d={line} fill="none" stroke="var(--color-teal)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {placed.map((point, index) => (
            <span
              key={point.x}
              aria-hidden="true"
              className={cn("absolute rounded-full bg-teal ring-2 ring-surface transition-transform", index === active ? "size-3 scale-125" : "size-2.5")}
              style={{ left: `${point.left}%`, top: `${point.top}%`, translate: "-50% -50%" }}
            />
          ))}
          {placed.map((point) => {
            if (!point.label) return null;
            // Where a marker runs through the point, the label steps aside to its left.
            const isOnMarker = markers.some((marker) => marker.x === point.x);
            return (
              <span key={point.x} aria-hidden="true" className={cn("absolute font-extrabold whitespace-nowrap text-ink", isOnMarker ? "-translate-x-full" : anchor(point.left))} style={{ left: isOnMarker ? `calc(${point.left}% - 0.45rem)` : `${point.left}%`, top: `calc(${point.top}% ${point.isLabelBelow ? "+ 0.55rem" : "- 1.45rem"})` }}>
                {point.label}
              </span>
            );
          })}

          {activePoint ? (
            <p aria-hidden="true" className={cn("pointer-events-none absolute z-10 m-0 max-w-[14rem] rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-paper shadow-lift", anchor(activePoint.left))} style={{ left: `${activePoint.left}%`, top: `calc(${Math.min(activePoint.top, 70)}% - 2.4rem)` }}>
              {describe(activePoint)}
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite">{activePoint ? describe(activePoint) : ""}</p>
        </div>

        <div />
        <div className="relative mt-1.5 h-4 tabular-nums" aria-hidden="true">
          {x.ticks.map((tick) => {
            const left = percent(tick, x);
            return <span key={tick} className={cn("absolute whitespace-nowrap", left < 4 ? "translate-x-0" : left > 96 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${left}%` }}>{x.format(tick)}</span>;
          })}
        </div>
      </div>

      {/* A table ignores the size limits of `sr-only` and would widen the page, so a wrapper carries them. */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead><tr><th scope="col">{x.title}</th><th scope="col">{y.title}</th></tr></thead>
          <tbody>{points.map((point) => <tr key={point.x}><td>{x.format(point.x)}</td><td>{y.format(point.y)}</td></tr>)}</tbody>
        </table>
      </div>
    </figure>
  );
}
