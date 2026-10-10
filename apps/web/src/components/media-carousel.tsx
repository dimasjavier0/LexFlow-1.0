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
