import { useState } from "react";
import type { AlertTone } from "../../components/ui";
import { Button } from "../../components/ui";
import { errorMessage } from "../../hooks/use-async-action";
import { confirmMissingMedia, previewMissingMedia, type MissingMediaPreview as Preview } from "../../lib/admin-api";
import type { AdminLibrary } from "./use-admin-library";

type MissingMediaPreviewProps = {
  collectionId: string;
  library: AdminLibrary;
  notify: (text: string, tone?: AlertTone) => void;
};

/** Proposes images and pronunciations for incomplete words; nothing is saved until confirmed. */
export function MissingMediaPreview({ collectionId, library, notify }: MissingMediaPreviewProps) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [pending, setPending] = useState<"preview" | "confirm" | null>(null);

  const prepare = async () => {
    const { session } = library;
    if (!session) return;
    setPending("preview");
    try {
      const result = await previewMissingMedia(session, collectionId);
      setPreviews(result);
      if (result.length) notify(`${result.length} ${result.length === 1 ? "palabra lista" : "palabras listas"} para revisar.`, "info");
      else notify("Todas las palabras ya tienen imágenes y sonido.");
    } catch (error) {
      notify(errorMessage(error, "No se pudo preparar la vista previa."), "error");
    } finally {
      setPending(null);
    }
  };

  const confirm = async () => {
    const { session } = library;
    if (!session) return;
    setPending("confirm");
    try {
      await confirmMissingMedia(session, collectionId, previews);
      setPreviews([]);
      await library.loadWords(collectionId);
      notify("Imágenes y pronunciaciones guardadas.");
    } catch (error) {
      notify(errorMessage(error, "No se pudo guardar el contenido propuesto."), "error");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        {previews.length ? <Button variant="ghost" size="sm" disabled={pending !== null} onClick={() => setPreviews([])}>Descartar</Button> : null}
        <Button variant="secondary" size="sm" disabled={pending !== null} isLoading={pending === "preview"} loadingLabel="Preparando vista previa..." onClick={() => void prepare()}>
          Completar imágenes y sonido
        </Button>
        {previews.length ? <Button size="sm" disabled={pending !== null} isLoading={pending === "confirm"} loadingLabel="Guardando..." onClick={() => void confirm()}>Confirmar y guardar</Button> : null}
      </div>
      {previews.length ? (
        <div className="grid gap-2.5 rounded-xl border border-sun bg-sun-soft p-3.5">
          <strong className="text-xs text-warning">Vista previa, todavía no guardada</strong>
          {previews.map((item) => (
            <div key={item.wordId} className="grid items-center gap-3 rounded-lg border border-sun/50 bg-surface p-2.5 sm:grid-cols-[minmax(6rem,0.7fr)_1fr_1fr]">
              <div className="grid gap-1">
                <b>{item.term}</b>
                <small className="text-[0.7rem] text-muted">{item.images.length ? `${item.images.length} imágenes propuestas` : "Sin imágenes nuevas"}</small>
              </div>
              <div className="flex gap-2">
                {item.images.map((image) => <img key={image.url} className="h-12 w-18 rounded-md object-cover" src={image.url} alt={`Propuesta para ${item.term}`} />)}
              </div>
              {item.audio ? <audio className="h-8 w-full" controls src={item.audio.url} aria-label={`Pronunciación de ${item.term}`} /> : <small className="text-[0.7rem] text-muted">Sin pronunciación nueva</small>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
