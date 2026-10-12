import { Button, ConfirmButton } from "../../components/ui";
import type { AdminWord, WordsAction } from "../../lib/admin-api";

/** Pixabay download links stop working after a day; only these images can be repaired. */
const EXPIRING_PIXABAY_URL_PREFIX = "https://pixabay.com/get/";

type WordSelectionBarProps = {
  /** Words currently listed, after the filter. */
  total: number;
  /** Selected words among the listed ones. */
  selectedWords: AdminWord[];
  onSelectAll: (isSelected: boolean) => void;
  onAction: (action: WordsAction) => void;
  /** Action being applied, if any. */
  pending: WordsAction | null;
};

/** Select-all checkbox plus the actions that make sense for the selected words. */
export function WordSelectionBar({ total, selectedWords, onSelectAll, onAction, pending }: WordSelectionBarProps) {
  const isBusy = pending !== null;
  const selected = selectedWords.length;
  const allSelected = selected === total;
  const hasDrafts = selectedWords.some((word) => !word.isPublished);
  const hasPublished = selectedWords.some((word) => word.isPublished);
  const hasImages = selectedWords.some((word) => word.images.length > 0);
  const hasExpiredImages = selectedWords.some((word) => word.images.some((image) => image.url.startsWith(EXPIRING_PIXABAY_URL_PREFIX)));
  // An action stays on screen while it runs, even once the reloaded words no longer need it.
  const offers = (action: WordsAction, applies: boolean) => applies || pending === action;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface px-3 py-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
        <input
          type="checkbox"
          className="size-4 cursor-pointer accent-teal-dark"
          checked={allSelected}
          ref={(input) => {
            if (input) input.indeterminate = selected > 0 && !allSelected;
          }}
          disabled={isBusy}
          onChange={(event) => onSelectAll(event.target.checked)}
        />
        {selected ? `${selected} de ${total} seleccionadas` : "Seleccionar todas"}
      </label>
      {selected ? (
        // Remounting on each selection size disarms a pending confirmation.
        <div key={selected} className="ml-auto flex flex-wrap items-center gap-1.5">
          {offers("publish", hasDrafts) ? <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "publish"} loadingLabel="Publicando..." onClick={() => onAction("publish")}>Publicar</Button> : null}
          {offers("unpublish", hasPublished) ? <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "unpublish"} loadingLabel="Guardando..." onClick={() => onAction("unpublish")}>Pasar a borrador</Button> : null}
          {offers("repair-images", hasExpiredImages) ? <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "repair-images"} loadingLabel="Reparando..." onClick={() => onAction("repair-images")}>Reparar imágenes</Button> : null}
          {hasImages ? (
            <ConfirmButton size="sm" confirmLabel="Sí, reemplazar" disabled={isBusy && pending !== "refresh-images"} isLoading={pending === "refresh-images"} loadingLabel="Reemplazando..." onConfirm={() => onAction("refresh-images")}>Reemplazar imágenes</ConfirmButton>
          ) : (
            // Nothing is lost when no selected word has images, so there is no second click.
            <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "refresh-images"} loadingLabel="Buscando..." onClick={() => onAction("refresh-images")}>Buscar imágenes</Button>
          )}
          {offers("delete-images", hasImages) ? <ConfirmButton size="sm" confirmLabel="Sí, eliminar imágenes" disabled={isBusy && pending !== "delete-images"} isLoading={pending === "delete-images"} onConfirm={() => onAction("delete-images")}>Eliminar imágenes</ConfirmButton> : null}
          <ConfirmButton size="sm" confirmLabel="Sí, quitar palabras" disabled={isBusy && pending !== "remove"} isLoading={pending === "remove"} loadingLabel="Quitando..." onConfirm={() => onAction("remove")}>Quitar de la colección</ConfirmButton>
        </div>
      ) : null}
    </div>
  );
}
