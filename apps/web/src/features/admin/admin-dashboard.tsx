import { useCallback, useState } from "react";
import type { AlertTone, ToastMessage } from "../../components/ui";
import { Alert, Button, EmptyState, Eyebrow, FilterChips, Modal, Spinner, Toast } from "../../components/ui";
import { AdminLayout } from "../../layouts/admin-layout";
import { errorMessage } from "../../hooks/use-async-action";
import { repairImages, type AdminCollection, type BulkWordsResult } from "../../lib/admin-api";
import { BulkWordsModal } from "./bulk-words-modal";
import { CollectionFormModal } from "./collection-form-modal";
import { DeleteCollectionModal } from "./delete-collection-modal";
import { CollectionRow,WORD_FILTER_OPTIONS, type WordFilter } from "./collection-row";
import { useAdminLibrary } from "./use-admin-library";
import { WordEditor } from "./word-editor";

type ModalState = { type: "collection"; collection?: AdminCollection } | { type: "delete-collection"; collection: AdminCollection } | { type: "bulk" } | { type: "word" } | null;

const QUICK_ACTIONS: Array<{ modal: NonNullable<ModalState>; icon: string; title: string; description: string }> = [
  { modal: { type: "word" }, icon: "＋", title: "Nueva palabra", description: "Crea una palabra con sus imágenes y video." },
  { modal: { type: "bulk" }, icon: "☷", title: "Lista rápida", description: "Añade hasta 50 palabras de una vez." },
  { modal: { type: "collection" }, icon: "▦", title: "Nueva colección", description: "Prepara una nueva unidad de vocabulario." },
];

function bulkSummary(results: BulkWordsResult[]): string {
  const total = (pick: (result: BulkWordsResult) => number) => results.reduce((sum, result) => sum + pick(result), 0);
  const addedCount = total((result) => result.words.length);
  const skippedCount = total((result) => result.skipped);
  const failedAudioCount = total((result) => result.failedAudio);
  const createdCount = results.filter((result) => result.collectionCreated).length;
  const added = `${addedCount} ${addedCount === 1 ? "palabra añadida" : "palabras añadidas"}${results.length > 1 ? ` en ${results.length} listas` : ""}`;
  const created = createdCount ? `; ${createdCount} ${createdCount === 1 ? "colección nueva" : "colecciones nuevas"}` : "";
  const skipped = skippedCount ? `; ${skippedCount} repetidas omitidas` : "";
  const failedAudio = failedAudioCount ? `; ${failedAudioCount} sin pronunciación` : "";
  return `${added}${created}${skipped}${failedAudio}.`;
}

export function AdminDashboard() {
  const library = useAdminLibrary();
  const { collections, loadError, reloadCollections, upsertWords, loadWords, wordsByCollection, session } = library;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [wordFilter, setWordFilter] = useState<WordFilter>("all");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  const notify = useCallback((text: string, tone: AlertTone = "success") => setToast({ text, tone }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const closeModal = () => setModal(null);

  const repairAllImages = async () => {
    if (!session) return;
    setIsRepairing(true);
    try {
      const result = await repairImages(session);
      // Covers and every word list already on screen may show repaired images.
      await Promise.all([reloadCollections(), ...Object.keys(wordsByCollection).map((collectionId) => loadWords(collectionId))]);
      if (!result.repaired && !result.failed) {
        notify("No hay imágenes caducadas: todas están guardadas en el servidor.");
        return;
      }
      const repaired = `${result.repaired} ${result.repaired === 1 ? "imagen reparada" : "imágenes reparadas"}`;
      const failed = result.failed ? `; ${result.failed} no se pudieron recuperar` : "";
      const remaining = result.remaining ? `; quedan ${result.remaining}, vuelve a pulsar en un minuto` : "";
      notify(`${repaired}${failed}${remaining}.`, result.failed || result.remaining ? "info" : "success");
    } catch (error) {
      notify(errorMessage(error, "No se pudieron reparar las imágenes."), "error");
    } finally {
      setIsRepairing(false);
    }
  };

  const showAddedWords = (collectionId: string, message: string) => {
    setExpanded((current) => ({ ...current, [collectionId]: true }));
    closeModal();
    notify(message);
    void reloadCollections();
  };

  return (
    <AdminLayout title="Centro de contenido" description="Gestiona colecciones, palabras y su material desde un solo lugar.">
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Acciones rápidas">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => setModal(action.modal)}
            className="grid cursor-pointer content-start gap-1.5 rounded-2xl border border-line bg-surface p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-lift"
          >
            <span aria-hidden="true" className="text-3xl leading-none text-teal-dark">{action.icon}</span>
            <strong>{action.title}</strong>
            <small className="text-[0.82rem] text-muted">{action.description}</small>
          </button>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6" aria-labelledby="library-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>Biblioteca</Eyebrow>
            <h2 id="library-heading" className="mt-1 text-2xl font-bold tracking-tight">Colecciones</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {collections ? <span className="text-sm text-muted">{collections.length} en total</span> : null}
            <Button variant="secondary" size="sm" title="Descarga al servidor las imágenes de Pixabay cuyo enlace caducó" isLoading={isRepairing} loadingLabel="Reparando imágenes..." onClick={() => void repairAllImages()}>Reparar imágenes</Button>
          </div>
        </div>
        <FilterChips label="Filtrar palabras" options={WORD_FILTER_OPTIONS} value={wordFilter} onChange={setWordFilter} />
        {loadError ? <Alert action={<Button variant="secondary" size="sm" onClick={() => void reloadCollections()}>Reintentar</Button>}>{loadError}</Alert> : null}
        {!collections && !loadError ? <p className="m-0 flex items-center justify-center gap-2 py-10 text-sm text-muted"><Spinner /> Cargando colecciones...</p> : null}
        {collections?.length === 0 ? (
          <EmptyState title="Todavía no hay colecciones" description="Crea la primera para empezar a añadir vocabulario." action={<Button onClick={() => setModal({ type: "collection" })}>Nueva colección</Button>} />
        ) : null}
        {collections?.length ? (
          <ul className="m-0 grid list-none gap-2 p-0">
            {collections.map((collection) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                library={library}
                isExpanded={expanded[collection.id] ?? false}
                onToggle={() => setExpanded((current) => ({ ...current, [collection.id]: !current[collection.id] }))}
                onEdit={() => setModal({ type: "collection", collection })}
                onDelete={() => setModal({ type: "delete-collection", collection })}
                wordFilter={wordFilter}
                editingWordId={editingWordId}
                onEditWord={setEditingWordId}
                notify={notify}
              />
            ))}
          </ul>
        ) : null}
      </section>

      {modal?.type === "collection" ? (
        <CollectionFormModal
          collection={modal.collection}
          library={library}
          onClose={closeModal}
          onSaved={(message) => {
            closeModal();
            notify(message);
          }}
        />
      ) : null}
      {modal?.type === "delete-collection" ? (
        <DeleteCollectionModal
          collection={modal.collection}
          library={library}
          onClose={closeModal}
          onDeleted={(message) => {
            closeModal();
            notify(message);
          }}
        />
      ) : null}
      {modal?.type === "bulk" ? (
        <BulkWordsModal
          library={library}
          onClose={closeModal}
          onListDone={(result) => {
            upsertWords(result.collectionId, result.words);
            setExpanded((current) => ({ ...current, [result.collectionId]: true }));
            void reloadCollections();
          }}
          onDone={(results) => {
            closeModal();
            notify(bulkSummary(results));
          }}
        />
      ) : null}
      {modal?.type === "word" ? (
        <Modal title="Crear palabra" eyebrow="Nueva palabra" size="lg" onClose={closeModal}>
          <WordEditor
            collections={collections ?? []}
            onCancel={closeModal}
            onSaved={(word, collectionId) => {
              upsertWords(collectionId, [word]);
              showAddedWords(collectionId, `“${word.term}” guardada.`);
            }}
          />
        </Modal>
      ) : null}
      <Toast message={toast} onDismiss={dismissToast} />
    </AdminLayout>
  );
}
