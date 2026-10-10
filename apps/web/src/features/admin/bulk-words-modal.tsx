import { useMemo, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, Modal, Select } from "../../components/ui";
import { useAsyncAction } from "../../hooks/use-async-action";
import { createWordsBulk, type BulkWordsResult } from "../../lib/admin-api";
import { cn } from "../../lib/cn";
import { MAX_BULK_WORDS, parseBulkLines, type BulkLine } from "./parse-bulk-lines";
import type { AdminLibrary } from "./use-admin-library";

const NEW_COLLECTION = "new";

const LINE_SYMBOLS: Record<BulkLine["status"], string> = { valid: "✓", warning: "⚠", invalid: "✕", empty: "·" };
const LINE_CLASSES: Record<BulkLine["status"], string> = {
  valid: "text-[#cbd8e3] [&>b]:text-[#72d6a0]",
  warning: "bg-sun/10 text-[#f8d57a]",
  invalid: "bg-red-700/15 text-[#ff9b9b]",
  empty: "text-[#6f8496]",
};

type BulkWordsModalProps = {
  library: AdminLibrary;
  onClose: () => void;
  onDone: (result: BulkWordsResult) => void;
};

export function BulkWordsModal({ library, onClose, onDone }: BulkWordsModalProps) {
  const collections = library.collections ?? [];
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? NEW_COLLECTION);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [text, setText] = useState("");
  const save = useAsyncAction();

  const lines = useMemo(() => parseBulkLines(text), [text]);
  const validLines = lines.filter((line) => line.status === "valid");
  const invalidCount = lines.filter((line) => line.status === "invalid").length;
  const isOverLimit = validLines.length > MAX_BULK_WORDS;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const { session } = library;
    if (!session || !validLines.length || isOverLimit) return;
    let result: BulkWordsResult | undefined;
    await save.run(async () => {
      result = await createWordsBulk(session, collectionId, {
        words: validLines.map(({ term, translationEs }) => ({ term, translationEs })),
        ...(collectionId === NEW_COLLECTION ? { collectionName: collectionName.trim(), collectionSlug } : {}),
      });
    }, "No se pudo crear la lista de palabras.");
    if (result) onDone(result);
  };

  return (
    <Modal title="Lista de palabras" eyebrow="Carga rápida" onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <p className="m-0 text-sm leading-snug text-muted">
          Una palabra por línea con su traducción. Se crean como borradores A1 y se les buscan imágenes y pronunciación automáticamente.
        </p>
        <Field label="Colección">
          <Select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
            <option value={NEW_COLLECTION}>＋ Crear nueva colección</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </Select>
        </Field>
        {collectionId === NEW_COLLECTION ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la colección">
              <Input required maxLength={100} value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="Animals" />
            </Field>
            <Field label="Slug de la colección">
              <Input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={collectionSlug} onChange={(event) => setCollectionSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} placeholder="animals" />
            </Field>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-[#26384b] bg-[#101923] font-mono shadow-card">
          <div className="flex items-center justify-between gap-3 bg-[#1b2937] px-3 py-2 text-xs text-[#d7e2ec]">
            <label htmlFor="bulk-words-text">Palabras y traducciones</label>
            <small className="text-[0.68rem] text-[#9fb2c2]">palabra en inglés, traducción</small>
          </div>
          <textarea
            id="bulk-words-text"
            required
            rows={8}
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"cat, gato\ndog, perro\nelephant, elefante"}
            className="block w-full resize-y border-0 bg-transparent p-3.5 text-sm leading-7 text-[#dce7f0] caret-sun outline-none placeholder:text-[#6f8496]"
          />
          {text.trim() ? (
            <div className="grid max-h-44 overflow-auto border-t border-[#26384b] py-1.5 text-[0.72rem]" aria-live="polite">
              {lines.map((line) => (
                <div key={line.line} className={cn("grid min-h-6 grid-cols-[1.75rem_1.25rem_minmax(0,1fr)_auto] items-center gap-1.5 px-2.5 py-0.5", LINE_CLASSES[line.status])}>
                  <span className="text-right text-[#6f8496]">{line.line}</span>
                  <b className="text-center" aria-hidden="true">{LINE_SYMBOLS[line.status]}</b>
                  <span className="truncate">{line.raw || "—"}</span>
                  <small className="text-[0.66rem] opacity-80">{line.message}</small>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <p className={cn("m-0 text-xs font-extrabold", isOverLimit ? "text-danger" : "text-teal-dark")}>
          {validLines.length} válidas · {invalidCount} inválidas{isOverLimit ? ` · máximo ${MAX_BULK_WORDS} por lista` : ""}
        </p>
        {save.isPending ? <Alert tone="info">Buscando imágenes y generando pronunciaciones. Puede tardar unos segundos por palabra.</Alert> : null}
        {save.error ? <Alert>{save.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!validLines.length || isOverLimit} isLoading={save.isPending} loadingLabel="Añadiendo...">Añadir lista</Button>
        </div>
      </form>
    </Modal>
  );
}
