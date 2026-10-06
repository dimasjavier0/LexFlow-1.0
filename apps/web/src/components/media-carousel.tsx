type CarouselItem = { id: string; url: string };

type MediaCarouselProps = {
  items: CarouselItem[];
  index: number;
  onChange: (index: number) => void;
  alt: string;
  className?: string;
};

export function MediaCarousel({ items, index, onChange, alt, className = "" }: MediaCarouselProps) {
  if (!items.length) return <div className="image-placeholder">Imagen pendiente</div>;
  const move = (direction: -1 | 1) => onChange((index + direction + items.length) % items.length);
  return <div className={`media-carousel image-stage ${className}`.trim()}>
    <img className="learning-image" src={items[index].url} alt={`${alt} ${index + 1}`} />
    <div className="carousel-controls">
      <button className="round-button" onClick={() => move(-1)} aria-label="Imagen anterior">←</button>
      <span>{index + 1} / {items.length}</span>
      <button className="round-button" onClick={() => move(1)} aria-label="Imagen siguiente">→</button>
    </div>
  </div>;
}
