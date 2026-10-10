import { useState, type FormEvent } from "react";
import type { AlertTone } from "../../components/ui";
import { Button, Field, Input, Select } from "../../components/ui";
import { useAsyncAction } from "../../hooks/use-async-action";
import { createWord } from "../../lib/admin-api";
import { CEFR_LEVELS } from "../../lib/levels";
import { ImagePicker, type PickedImage } from "./image-picker";
import type { AdminLibrary } from "./use-admin-library";

type QuickWordFormProps = {
  collectionId: string;
  library: AdminLibrary;
  notify: (text: string, tone?: AlertTone) => void;
};

export function QuickWordForm({ collectionId, library, notify }: QuickWordFormProps) {
  const [term, setTerm] = useState("");
  const [translationEs, setTranslationEs] = useState("");
  const [level, setLevel] = useState<string>(CEFR_LEVELS[0]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const save = useAsyncAction();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const { session } = library;
    if (!session) return;
    const saved = await save.run(async () => {
      const word = await createWord(session, collectionId, {
        term: term.trim(),
        translationEs: translationEs.trim(),
        level,
        images: images.map(({ previewUrl: _previewUrl, ...image }) => image),
      });
      library.upsertWords(collectionId, [word]);
    }, "No se pudo crear la palabra.");
    if (!saved) return;
    notify(`“${term.trim()}” añadida a la colección.`);
    setTerm("");
    setTranslationEs("");
    setImages([]);
    void library.reloadCollections();
  };

  return (
    <form className="grid gap-3 rounded-2xl border border-line bg-surface p-3.5" onSubmit={(event) => void submit(event)}>
      <strong className="text-xs text-teal-dark">Añadir palabra</strong>
      <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_5.5rem_auto]">
        <Field label="Palabra en inglés">
          <Input required maxLength={100} value={term} onChange={(event) => setTerm(event.target.value)} placeholder="apple" />
        </Field>
        <Field label="Traducción">
          <Input required maxLength={200} value={translationEs} onChange={(event) => setTranslationEs(event.target.value)} placeholder="manzana" />
        </Field>
        <Field label="Nivel">
          <Select value={level} onChange={(event) => setLevel(event.target.value)}>
            {CEFR_LEVELS.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Field>
        <Button type="submit" isLoading={save.isPending} loadingLabel="Guardando...">Añadir</Button>
      </div>
      <details className="rounded-xl border border-line px-3 py-2">
        <summary className="cursor-pointer text-[0.82rem] font-semibold text-teal-dark">Añadir imágenes ({images.length}/4)</summary>
        <div className="pt-3 pb-1">
          <ImagePicker value={images} onChange={setImages} defaultQuery={term} />
        </div>
      </details>
      {save.error ? <p className="m-0 text-sm font-semibold text-danger" role="alert">{save.error}</p> : null}
    </form>
  );
}
