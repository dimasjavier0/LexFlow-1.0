import { Button, ConfirmButton } from "../../components/ui";
import type { WordsAction } from "../../lib/admin-api";

type WordSelectionBarProps = {
  /** Words currently listed, after the filter. */
  total: number;
  selected: number;
  onSelectAll: (isSelected: boolean) => void;
  onAction: (action: WordsAction) => void;
  /** Action being applied, if any. */
  pending: WordsAction | null;
};

/** Select-all checkbox plus the actions that apply to the selected words. */
export function WordSelectionBar({ total, selected, onSelectAll, onAction, pending }: WordSelectionBarProps) {
  const isBusy = pending !== null;
  const allSelected = selected === total;

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
          <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "publish"} loadingLabel="Publicando..." onClick={() => onAction("publish")}>Publicar</Button>
          <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "unpublish"} loadingLabel="Guardando..." onClick={() => onAction("unpublish")}>Pasar a borrador</Button>
          <Button variant="secondary" size="sm" disabled={isBusy} isLoading={pending === "repair-images"} loadingLabel="Reparando..." onClick={() => onAction("repair-images")}>Reparar imágenes</Button>
          <ConfirmButton size="sm" confirmLabel="Sí, reemplazar" disabled={isBusy && pending !== "refresh-images"} isLoading={pending === "refresh-images"} loadingLabel="Reemplazando..." onConfirm={() => onAction("refresh-images")}>Reemplazar imágenes</ConfirmButton>
          <ConfirmButton size="sm" confirmLabel="Sí, eliminar imágenes" disabled={isBusy && pending !== "delete-images"} isLoading={pending === "delete-images"} onConfirm={() => onAction("delete-images")}>Eliminar imágenes</ConfirmButton>
          <ConfirmButton size="sm" confirmLabel="Sí, quitar palabras" disabled={isBusy && pending !== "remove"} isLoading={pending === "remove"} loadingLabel="Quitando..." onConfirm={() => onAction("remove")}>Quitar de la colección</ConfirmButton>
        </div>
      ) : null}
    </div>
  );
}
