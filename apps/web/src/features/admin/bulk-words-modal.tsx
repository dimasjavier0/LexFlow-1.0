import { useMemo, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Field, Input, Modal, Select } from "../../components/ui";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { createWordsBulk, type BulkWordsResult } from "../../lib/admin-api";
import { cn } from "../../lib/cn";
import { normalizeText, slugify } from "../../lib/slug";
import { MAX_BULK_LISTS, MAX_BULK_WORDS, parseBulkMarkdown, type BulkLine } from "./parse-bulk-lines";
import type { AdminLibrary } from "./use-admin-library";

const NEW_COLLECTION = "new";

const LINE_SYMBOLS: Record<BulkLine["status"], string> = { valid: "✓", warning: "⚠", invalid: "✕", empty: "·", heading: "#" };
const LINE_CLASSES: Record<BulkLine["status"], string> = {
  valid: "text-[#cbd8e3] [&>b]:text-[#72d6a0]",
  warning: "bg-sun/10 text-[#f8d57a]",
  invalid: "bg-red-700/15 text-[#ff9b9b]",
  empty: "text-[#6f8496]",
  heading: "bg-white/5 font-bold text-[#8fd3ff]",
};

const PLACEHOLDER = "# Animals\n- cat, gato\n- dog, perro\n\n# Food\napple, manzana\nbread, pan";

type BulkWordsModalProps = {
  library: AdminLibrary;
  onClose: () => void;
  /** Called as each list is saved, so finished lists show up even if a later one fails. */
  onListDone: (result: BulkWordsResult) => void;
  onDone: (results: BulkWordsResult[]) => void;
};

export function BulkWordsModal({ library, onClose, onListDone, onDone }: BulkWordsModalProps) {
  const collections = library.collections ?? [];
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? NEW_COLLECTION);
  const [collectionName, setCollectionName] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const collectionSlug = customSlug ?? slugify(collectionName);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const save = useAsyncAction();

  const { lines, lists } = useMemo(() => parseBulkMarkdown(text), [text]);
  const validCount = lists.reduce((sum, list) => sum + list.words.length, 0);
  const invalidCount = lines.filter((line) => line.status === "invalid").length;
  // Words written before any heading go to the collection picked in the form.
  const hasUntitledList = lists.some((list) => list.title === null);
  const isCollectionPickerVisible = hasUntitledList || lists.length === 0;
  const oversizedList = lists.find((list) => list.words.length > MAX_BULK_WORDS);
  const limitError = oversizedList
    ? `“${oversizedList.title ?? "La lista sin título"}” supera las ${MAX_BULK_WORDS} palabras por lista.`
    : lists.length > MAX_BULK_LISTS ? `Máximo ${MAX_BULK_LISTS} listas por carga.` : null;

  const existingCollection = (title: string) => collections.find((collection) => normalizeText(collection.name) === normalizeText(title) || collection.slug === slugify(title));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const { session } = library;
    if (!session || !validCount || limitError) return;
    const results: BulkWordsResult[] = [];
    const isComplete = await save.run(async () => {
      for (const [index, list] of lists.entries()) {
        const name = list.title ?? (collectionId === NEW_COLLECTION ? collectionName.trim() : collections.find((collection) => collection.id === collectionId)?.name ?? "");
        setProgress(`Lista ${index + 1} de ${lists.length}: ${name}`);
        // Titled lists are matched to a collection by name on the server; it creates the missing ones.
        const target = list.title === null
          ? { id: collectionId, ...(collectionId === NEW_COLLECTION ? { collectionName: name, collectionSlug } : {}) }
          : { id: NEW_COLLECTION, collectionName: list.title, collectionSlug: slugify(list.title) };
        try {
          const { id, ...newCollection } = target;
          const result = await createWordsBulk(session, id, { words: list.words, ...newCollection });
          results.push(result);
          onListDone(result);
        } catch (error) {
          const saved = results.length ? ` Las ${results.length} anteriores sí se guardaron; puedes reintentar sin duplicar nada.` : "";
          throw new Error(`“${name}”: ${errorMessage(error, "no se pudo crear la lista.")}${saved}`);
        }
      }
    }, "No se pudo crear la lista de palabras.");
    setProgress(null);
    if (isComplete) onDone(results);
  };

  return (
    <Modal title="Lista de palabras" eyebrow="Carga rápida" size="lg" onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <p className="m-0 text-sm leading-snug text-muted">
          Pega una o varias listas en Markdown: cada título (<code># Animals</code>) es una colección y debajo va una palabra por línea con su traducción.
          Las colecciones y palabras que ya existen se reutilizan, sin distinguir acentos ni mayúsculas; el resto se crea como borrador A1 con imágenes y pronunciación.
        </p>
        <div className="overflow-hidden rounded-xl border border-[#26384b] bg-[#101923] font-mono shadow-card">
          <div className="flex items-center justify-between gap-3 bg-[#1b2937] px-3 py-2 text-xs text-[#d7e2ec]">
            <label htmlFor="bulk-words-text">Listas de palabras</label>
            <small className="text-[0.68rem] text-[#9fb2c2]"># título · palabra en inglés, traducción</small>
          </div>
          <textarea
            id="bulk-words-text"
            required
            rows={10}
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={PLACEHOLDER}
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
        {isCollectionPickerVisible ? (
          <Field label={lists.length > 1 ? "Colección para las palabras sin título" : "Colección"} hint={lists.length ? undefined : "Solo se usa para las palabras que no están bajo un título."}>
            <Select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
              <option value={NEW_COLLECTION}>＋ Crear nueva colección</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </Select>
          </Field>
        ) : null}
        {isCollectionPickerVisible && collectionId === NEW_COLLECTION ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la colección">
              <Input required={hasUntitledList} maxLength={100} value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="Animals" />
            </Field>
            <Field label="Slug de la colección">
              <Input required={hasUntitledList} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={collectionSlug} onChange={(event) => setCustomSlug(event.target.value)} placeholder="animals" />
            </Field>
          </div>
        ) : null}
        {lists.some((list) => list.title !== null) ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Listas detectadas">
            {lists.filter((list) => list.title !== null).map((list) => (
              <li key={list.title}>
                <Badge tone={existingCollection(list.title!) ? "neutral" : "teal"}>
                  {list.title} · {list.words.length} · {existingCollection(list.title!) ? "existente" : "nueva"}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={cn("m-0 text-xs font-extrabold", limitError ? "text-danger" : "text-teal-dark")}>
          {validCount} válidas · {invalidCount} inválidas{lists.length > 1 ? ` · ${lists.length} listas` : ""}{limitError ? ` · ${limitError}` : ""}
        </p>
        {save.isPending ? <Alert tone="info">{progress ? `${progress}. ` : ""}Buscando imágenes y generando pronunciaciones.</Alert> : null}
        {save.error ? <Alert>{save.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!validCount || limitError !== null} isLoading={save.isPending} loadingLabel="Añadiendo...">{lists.length > 1 ? `Añadir ${lists.length} listas` : "Añadir lista"}</Button>
        </div>
      </form>
    </Modal>
  );
}
