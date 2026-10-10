import { cn } from "../lib/cn";

type ImageGridProps = {
  items: Array<{ id: string; url: string }>;
  alt: string;
};

/** Shows every image of a word at once, so its meaning comes from the set rather than a single picture. */
export function ImageGrid({ items, alt }: ImageGridProps) {
  if (!items.length) return <div className="grid aspect-[1.45/1] place-items-center rounded-2xl bg-teal-soft text-sm text-muted">Imagen pendiente</div>;
  if (items.length === 1) return <img className="block aspect-[1.45/1] w-full rounded-2xl bg-teal-soft object-cover" src={items[0].url} alt={alt} />;

  // Two images stack; from three on they share a two-column grid, with an odd first one spanning the row.
  const isPair = items.length === 2;
  const hasWideFirst = !isPair && items.length % 2 === 1;
  return (
    <div className={cn("grid gap-2", !isPair && "grid-cols-2")}>
      {items.map((item, index) => {
        const isWide = isPair || (hasWideFirst && index === 0);
        return (
          <img
            key={item.id}
            className={cn("block w-full rounded-2xl bg-teal-soft object-cover", isWide ? "aspect-[2/1]" : "aspect-[4/3]", isWide && !isPair && "col-span-2")}
            src={item.url}
            alt={`${alt} ${index + 1}`}
          />
        );
      })}
    </div>
  );
}
