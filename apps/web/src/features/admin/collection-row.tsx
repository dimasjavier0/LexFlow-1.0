import { useCallback, useEffect, useState } from "react";
import type { AlertTone } from "../../components/ui";
import { Alert, Button, EmptyState, Spinner, Switch } from "../../components/ui";
import { errorMessage } from "../../hooks/use-async-action";
import { removeWordFromCollection, runWordsAction, setCollectionPublication, setCollectionWordsPublication, setWordPublication, type AdminCollection, type AdminWord, type WordsAction } from "../../lib/admin-api";
import { MissingMediaPreview } from "./missing-media-preview";
import { QuickWordForm } from "./quick-word-form";
import type { AdminLibrary } from "./use-admin-library";
import { WordEditor } from "./word-editor";
import { WordRow } from "./word-row";
import { WordSelectionBar } from "./word-selection-bar";

export type WordFilter = "all" | "translation" | "images" | "audio";

export const WORD_FILTER_OPTIONS: ReadonlyArray<{ value: WordFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "translation", label: "Sin significado" },
  { value: "images", label: "Sin imágenes" },
  { value: "audio", label: "Sin sonido" },
];

function matchesFilter(word: AdminWord, filter: WordFilter): boolean {
  if (filter === "translation") return !word.translationEs.trim();
  if (filter === "images") return word.images.length === 0;
  if (filter === "audio") return word.audios.length === 0;
  return true;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What to tell the admin once a bulk action has finished. */
function actionSummary(action: WordsAction, affected: number, failed: number): { text: string; tone: AlertTone } {
  if (action === "publish") return { text: `${plural(affected, "palabra publicada", "palabras publicadas")}.`, tone: "success" };
  if (action === "unpublish") return { text: `${plural(affected, "palabra devuelta", "palabras devueltas")} a borrador.`, tone: "success" };
  if (action === "delete-images") return { text: `${plural(affected, "imagen eliminada", "imágenes eliminadas")}.`, tone: "success" };
  if (action === "remove") return { text: `${plural(affected, "palabra quitada", "palabras quitadas")} de la colección.`, tone: "success" };
  if (action === "refresh-images") {
    const refreshed = `Imágenes reemplazadas en ${plural(affected, "palabra", "palabras")}`;
    return failed ? { text: `${refreshed}; ${failed} sin resultados en Pixabay.`, tone: "info" } : { text: `${refreshed}.`, tone: "success" };
  }
  if (!affected && !failed) return { text: "Las palabras seleccionadas no tienen imágenes caducadas.", tone: "info" };
  const repaired = plural(affected, "imagen reparada", "imágenes reparadas");
  return failed ? { text: `${repaired}; ${failed} no se pudieron recuperar. Prueba «Reemplazar imágenes».`, tone: "info" } : { text: `${repaired}.`, tone: "success" };
}

type CollectionRowProps = {
  collection: AdminCollection;
  library: AdminLibrary;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  wordFilter: WordFilter;
  editingWordId: string | null;
  onEditWord: (wordId: string | null) => void;
  notify: (text: string, tone?: AlertTone) => void;
};

export function CollectionRow({ collection, library, isExpanded, onToggle, onEdit, wordFilter, editingWordId, onEditWord, notify }: CollectionRowProps) {
  const { loadWords, patchCollection, session } = library;
  const words = library.wordsByCollection[collection.id];
  const isLoaded = words !== undefined;
  const [wordsError, setWordsError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishingWords, setIsPublishingWords] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<WordsAction | null>(null);

  const fetchWords = useCallback(() => {
    setWordsError(null);
    loadWords(collection.id).catch((error: unknown) => setWordsError(errorMessage(error, "No se pudieron cargar las palabras.")));
  }, [collection.id, loadWords]);

  useEffect(() => {
    if (isExpanded && !isLoaded) fetchWords();
  }, [fetchWords, isExpanded, isLoaded]);

  const togglePublication = async (isPublished: boolean) => {
    if (!session) return;
    setIsPublishing(true);
    try {
      await setCollectionPublication(session, collection.id, isPublished);
      patchCollection(collection.id, { isPublished });
      notify(isPublished ? `“${collection.name}” publicada.` : `“${collection.name}” devuelta a borrador.`);
    } catch (error) {
      notify(errorMessage(error, "No se pudo cambiar el estado de la colección."), "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const publishWord = async (word: AdminWord, isPublished: boolean) => {
    if (!session) return;
    try {
      await setWordPublication(session, word.id, isPublished);
      library.upsertWords(collection.id, [{ ...word, isPublished }]);
    } catch (error) {
      notify(errorMessage(error, "No se pudo cambiar el estado de la palabra."), "error");
    }
  };

  const removeWord = async (word: AdminWord) => {
    if (!session) return;
    try {
      await removeWordFromCollection(session, collection.id, word.id);
      if (editingWordId === word.id) onEditWord(null);
      library.removeWord(collection.id, word.id);
      notify(`“${word.term}” quitada de la colección.`);
      void library.reloadCollections();
    } catch (error) {
      notify(errorMessage(error, "No se pudo quitar la palabra."), "error");
    }
  };

  const publishAllWords = async () => {
    if (!session) return;
    setIsPublishingWords(true);
    try {
      await setCollectionWordsPublication(session, collection.id, true);
      await loadWords(collection.id);
      notify(`Todas las palabras de “${collection.name}” están publicadas.`);
    } catch (error) {
      notify(errorMessage(error, "No se pudieron publicar las palabras."), "error");
    } finally {
      setIsPublishingWords(false);
    }
  };

  const publishedCount = words?.filter((word) => word.isPublished).length ?? 0;
  const visibleWords = words?.filter((word) => matchesFilter(word, wordFilter)) ?? [];
  // Words hidden by the filter are never acted on, even if they were selected before.
  const selectedWords = visibleWords.filter((word) => selectedIds.has(word.id));

  const selectWord = (wordId: string, isSelected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (isSelected) next.add(wordId);
      else next.delete(wordId);
      return next;
    });
  };

  const applyAction = async (action: WordsAction) => {
    if (!session || !selectedWords.length) return;
    const wordIds = selectedWords.map((word) => word.id);
    setPendingAction(action);
    try {
      const result = await runWordsAction(session, collection.id, wordIds, action);
      if (action === "remove") {
        if (editingWordId && wordIds.includes(editingWordId)) onEditWord(null);
        void library.reloadCollections();
      }
      await loadWords(collection.id);
      setSelectedIds(new Set());
      const summary = actionSummary(action, result.affected, result.failed);
      notify(summary.text, summary.tone);
    } catch (error) {
      notify(errorMessage(error, "No se pudo aplicar la acción a las palabras seleccionadas."), "error");
    } finally {
      setPendingAction(null);
    }
  };
  const wordCount = collection._count.words;
  const panelId = `collection-panel-${collection.id}`;

  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <button type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={onToggle} className="flex min-w-0 flex-1 basis-60 cursor-pointer items-center gap-3 rounded-xl p-2 text-left hover:bg-teal-soft/50">
          <span aria-hidden="true" className={`w-4 text-center text-xl text-teal-dark transition-transform ${isExpanded ? "rotate-90" : ""}`}>›</span>
          {collection.imageUrl ? (
            <img className="size-11 shrink-0 rounded-xl object-cover" src={collection.imageUrl} alt="" />
          ) : (
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-soft font-black text-teal-dark">{collection.name.slice(0, 1).toUpperCase()}</span>
          )}
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{collection.name}</strong>
            <small className="block truncate text-[0.82rem] text-muted">/{collection.slug} · {wordCount} {wordCount === 1 ? "palabra" : "palabras"}</small>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-2 pr-1">
          <Button variant="secondary" size="sm" onClick={onEdit}>Editar</Button>
          <Switch
            checked={collection.isPublished}
            disabled={isPublishing}
            onChange={(isPublished) => void togglePublication(isPublished)}
            label={`${collection.isPublished ? "Despublicar" : "Publicar"} ${collection.name}`}
            onText="Publicada"
            offText="Borrador"
          />
        </div>
      </div>
      {isExpanded ? (
        <div id={panelId} className="grid gap-3 border-t border-line bg-paper/60 p-3">
          {wordsError ? <Alert action={<Button variant="secondary" size="sm" onClick={fetchWords}>Reintentar</Button>}>{wordsError}</Alert> : null}
          {!isLoaded && !wordsError ? <p className="m-0 flex items-center justify-center gap-2 py-6 text-sm text-muted"><Spinner /> Cargando palabras...</p> : null}
          {isLoaded ? (
            <>
              {words.length ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-xs text-muted">
                    <strong className={publishedCount === 0 ? "text-warning" : "text-teal-dark"}>{publishedCount} de {words.length}</strong> publicadas. Los estudiantes solo ven las palabras publicadas.
                  </p>
                  {publishedCount < words.length ? <Button size="sm" isLoading={isPublishingWords} loadingLabel="Publicando..." onClick={() => void publishAllWords()}>Publicar todas</Button> : null}
                </div>
              ) : null}
              {words.length ? <MissingMediaPreview collectionId={collection.id} library={library} notify={notify} /> : null}
              {words.length === 0 ? <EmptyState title="Esta colección todavía no tiene palabras" description="Añade la primera con el formulario de abajo o usa la lista rápida." /> : null}
              {words.length > 0 && visibleWords.length === 0 ? <EmptyState title="Ninguna palabra coincide con el filtro" description="Cambia el filtro para ver el resto de la colección." /> : null}
              {visibleWords.length ? (
                <WordSelectionBar
                  total={visibleWords.length}
                  selected={selectedWords.length}
                  onSelectAll={(isSelected) => setSelectedIds(new Set(isSelected ? visibleWords.map((word) => word.id) : []))}
                  onAction={(action) => void applyAction(action)}
                  pending={pendingAction}
                />
              ) : null}
              {visibleWords.length ? (
                <ul className="m-0 grid list-none items-start gap-1.5 p-0 xl:grid-cols-2">
                  {visibleWords.map((word) => (
                    <WordRow key={word.id} word={word} isEditing={editingWordId === word.id} onToggleEdit={() => onEditWord(editingWordId === word.id ? null : word.id)} isSelected={selectedIds.has(word.id)} onSelect={(isSelected) => selectWord(word.id, isSelected)} onPublish={(isPublished) => publishWord(word, isPublished)} onRemove={() => removeWord(word)}>
                      {editingWordId === word.id ? (
                        <WordEditor
                          word={word}
                          collections={library.collections ?? []}
                          initialCollectionId={collection.id}
                          className="border-t border-line p-3.5"
                          onMediaChange={(changed) => library.upsertWords(collection.id, [changed])}
                          onRemove={() => removeWord(word)}
                          onCancel={() => onEditWord(null)}
                          onSaved={(saved) => {
                            library.upsertWords(collection.id, [saved]);
                            onEditWord(null);
                            notify("Palabra guardada.");
                          }}
                        />
                      ) : null}
                    </WordRow>
                  ))}
                </ul>
              ) : null}
              <QuickWordForm collectionId={collection.id} library={library} notify={notify} />
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
