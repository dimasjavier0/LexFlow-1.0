import { useState, type ReactNode } from "react";
import { Badge, Button, IconButton, Switch } from "../../components/ui";
import type { AdminWord } from "../../lib/admin-api";
import { cn } from "../../lib/cn";

type WordRowProps = {
  word: AdminWord;
  isEditing: boolean;
  onToggleEdit: () => void;
  /** Whether the word is part of the selection the bulk actions apply to. */
  isSelected: boolean;
  /** True while a bulk action runs on the selection. */
  isSelectionDisabled: boolean;
  onSelect: (isSelected: boolean) => void;
  /** Persists the new publication state; rejections are handled by the caller. */
  onPublish: (isPublished: boolean) => Promise<void>;
  /** Removes the word from the collection; rejections are handled by the caller. */
  onRemove: () => Promise<void>;
  /** Inline editor, rendered under the row while editing. */
  children?: ReactNode;
};

export function WordRow({ word, isEditing, onToggleEdit, isSelected, isSelectionDisabled, onSelect, onPublish, onRemove, children }: WordRowProps) {
  const [cover, ...otherImages] = word.images;
  const [isPublishing, setIsPublishing] = useState(false);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const publish = async (isPublished: boolean) => {
    setIsPublishing(true);
    await onPublish(isPublished);
    setIsPublishing(false);
  };

  const remove = async () => {
    setIsRemoving(true);
    await onRemove();
    // Still mounted only if the removal failed.
    setIsRemoving(false);
    setIsConfirmingRemoval(false);
  };

  return (
    <li className={cn("overflow-hidden rounded-xl border bg-surface", isEditing ? "border-teal xl:col-span-2" : isSelected ? "border-teal" : "border-line")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2">
        <input type="checkbox" className="ml-1 size-4 shrink-0 cursor-pointer accent-teal-dark" aria-label={`Seleccionar ${word.term}`} checked={isSelected} disabled={isSelectionDisabled} onChange={(event) => onSelect(event.target.checked)} />
        <button type="button" aria-expanded={isEditing} onClick={onToggleEdit} className="flex min-w-0 flex-1 basis-40 cursor-pointer items-center gap-3 rounded-lg p-1 text-left hover:bg-teal-soft/50">
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
          <Switch
            checked={word.isPublished}
            disabled={isPublishing}
            onChange={(isPublished) => void publish(isPublished)}
            label={`${word.isPublished ? "Despublicar" : "Publicar"} ${word.term}`}
            onText="Publicada"
            offText="Borrador"
          />
          {isConfirmingRemoval ? (
            <>
              <Button variant="danger" size="sm" isLoading={isRemoving} loadingLabel="Quitando..." onClick={() => void remove()}>Sí, quitar</Button>
              <Button variant="ghost" size="sm" disabled={isRemoving} onClick={() => setIsConfirmingRemoval(false)}>Cancelar</Button>
            </>
          ) : (
            <IconButton label={`Quitar ${word.term} de la colección`} tone="plain" className="hover:bg-danger-soft! hover:text-danger!" onClick={() => setIsConfirmingRemoval(true)}>✕</IconButton>
          )}
        </div>
      </div>
      {children}
    </li>
  );
}
