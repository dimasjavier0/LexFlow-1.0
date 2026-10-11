import { Link } from "react-router-dom";

export function BrandMark() {
  return (
    <Link to="/" aria-label="LexFlow inicio" className="inline-flex items-center gap-2 text-sm font-black tracking-[0.15em] text-ink no-underline">
      <span aria-hidden="true" className="inline-block size-3.5 -rotate-45 rounded-[50%_50%_50%_0] bg-coral" />
      LEXFLOW
    </Link>
  );
}
