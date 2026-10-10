import { useState, type FormEvent } from "react";
import { PixabayPicker, type PixabayImage } from "../../components/pixabay-picker";
import type { AlertTone } from "../../components/ui";
import { Button, Field, Input, Select } from "../../components/ui";
import { useAsyncAction } from "../../hooks/use-async-action";
import { createWord } from "../../lib/admin-api";
import { CEFR_LEVELS } from "../../lib/levels";
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
  const [imageUrl, setImageUrl] = useState("");
  const [images, setImages] = useState<PixabayImage[]>([]);
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
        images: images.map((image) => ({ url: image.url, attribution: `Pixabay: ${image.user}`, metadata: { id: image.id, pageUrl: image.pageUrl, tags: image.tags } })),
      });
      library.upsertWords(collectionId, [word]);
    }, "No se pudo crear la palabra.");
    if (!saved) return;
    notify(`“${term.trim()}” añadida a la colección.`);
    setTerm("");
    setTranslationEs("");
    setImageUrl("");
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
      <Input type="text" inputMode="url" aria-label="URL de imagen o término de búsqueda" placeholder="URL de imagen" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
      <PixabayPicker imageUrl={imageUrl} onImageUrlChange={setImageUrl} selectedImages={images} onSelectedImagesChange={setImages} />
      {save.error ? <p className="m-0 text-sm font-semibold text-danger" role="alert">{save.error}</p> : null}
    </form>
  );
}
