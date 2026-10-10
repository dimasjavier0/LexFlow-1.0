import type { ReactNode } from "react";
import { Badge } from "../../components/ui";
import type { AdminWord } from "../../lib/admin-api";
import { cn } from "../../lib/cn";

type WordRowProps = {
  word: AdminWord;
  isEditing: boolean;
  onToggleEdit: () => void;
  /** Inline editor, rendered under the row while editing. */
  children?: ReactNode;
};

export function WordRow({ word, isEditing, onToggleEdit, children }: WordRowProps) {
  const [cover, ...otherImages] = word.images;

  return (
    <li className={cn("overflow-hidden rounded-xl border bg-surface", isEditing ? "border-teal" : "border-line")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2">
        <button type="button" aria-expanded={isEditing} onClick={onToggleEdit} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg p-1 text-left hover:bg-teal-soft/50">
          {cover ? (
            <img className="size-11 shrink-0 rounded-lg bg-teal-soft object-cover" src={cover.url} alt="" />
          ) : (
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-line/50 text-muted">?</span>
          )}
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{word.term}</strong>
            <small className="block truncate text-[0.82rem] text-muted">{word.translationEs.trim() || "Sin traducción"} · {word.level}</small>
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1.5 pr-1">
          {otherImages.length ? <Badge tone="neutral">+{otherImages.length} img</Badge> : null}
          {word.images.length ? null : <Badge tone="warning">Sin imágenes</Badge>}
          {word.audios.length ? null : <Badge tone="warning">Sin sonido</Badge>}
          <Badge tone={word.isPublished ? "teal" : "neutral"}>{word.isPublished ? "Publicada" : "Borrador"}</Badge>
        </div>
      </div>
      {children}
    </li>
  );
}
