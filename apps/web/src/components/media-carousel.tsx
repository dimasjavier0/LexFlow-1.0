import { IconButton } from "./ui";

type CarouselControlsProps = {
  index: number;
  count: number;
  onChange: (index: number) => void;
  /** Noun used in the button labels, e.g. "Imagen". */
  label: string;
};

/** Previous/next controls that wrap around; renders nothing for a single item. */
export function CarouselControls({ index, count, onChange, label }: CarouselControlsProps) {
  if (count < 2) return null;
  const move = (direction: -1 | 1) => onChange((index + direction + count) % count);
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs font-bold text-muted">
      <IconButton label={`${label} anterior`} onClick={() => move(-1)}>←</IconButton>
      <span>{index + 1} / {count}</span>
      <IconButton label={`${label} siguiente`} onClick={() => move(1)}>→</IconButton>
    </div>
  );
}

type MediaCarouselProps = {
  items: Array<{ id: string; url: string }>;
  index: number;
  onChange: (index: number) => void;
  alt: string;
};

export function MediaCarousel({ items, index, onChange, alt }: MediaCarouselProps) {
  const current = items[Math.min(index, items.length - 1)];
  if (!current) return <div className="grid aspect-[1.45/1] place-items-center rounded-2xl bg-teal-soft text-sm text-muted">Imagen pendiente</div>;
  return (
    <div className="grid gap-1">
      <img className="block aspect-[1.45/1] w-full rounded-2xl bg-teal-soft object-cover" src={current.url} alt={`${alt} ${index + 1}`} />
      <CarouselControls index={index} count={items.length} onChange={onChange} label="Imagen" />
    </div>
  );
}
