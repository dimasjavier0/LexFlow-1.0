import { Alert, Button, Modal } from "../../components/ui";
import { useAsyncAction } from "../../hooks/use-async-action";
import { deleteCollection, type AdminCollection } from "../../lib/admin-api";
import type { AdminLibrary } from "./use-admin-library";

type DeleteCollectionModalProps = {
  collection: AdminCollection;
  library: AdminLibrary;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

/** Asks before deleting a collection, spelling out what goes with it. */
export function DeleteCollectionModal({ collection, library, onClose, onDeleted }: DeleteCollectionModalProps) {
  const remove = useAsyncAction();
  const wordCount = collection._count.words;

  const confirm = async () => {
    const { session } = library;
    if (!session) return;
    const removed = await remove.run(async () => {
      await deleteCollection(session, collection.id);
      await library.reloadCollections();
    }, "No se pudo eliminar la colección.");
    if (removed) onDeleted(`“${collection.name}” eliminada.`);
  };

  return (
    <Modal title="¿Eliminar esta colección?" eyebrow="Colección" onClose={onClose}>
      <div className="grid gap-4">
        <p className="m-0 text-sm">
          Vas a eliminar <strong>“{collection.name}”</strong>
          {wordCount ? <> y {wordCount === 1 ? "su palabra" : <>sus <strong>{wordCount} palabras</strong></>}. Las que también estén en otra colección se conservan allí.</> : ", que no tiene palabras."}
        </p>
        <p className="m-0 text-sm text-muted">Esta acción no se puede deshacer.</p>
        {remove.error ? <Alert>{remove.error}</Alert> : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" isLoading={remove.isPending} loadingLabel="Eliminando..." onClick={() => void confirm()}>Sí, eliminar colección</Button>
        </div>
      </div>
    </Modal>
  );
}
