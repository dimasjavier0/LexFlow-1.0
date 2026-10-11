import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Alert, Button, ConfirmButton, Field, IconButton, Input, Select } from "../../components/ui";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "../../contexts/auth-context";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import {
  addWordAudio,
  addWordVideo,
  createWord,
  deleteWordAudio,
  deleteWordImage,
  deleteWordVideo,
  generateWordAudio,
  updateWord,
  uploadWordImage,
  type AdminWord,
  type NewWordAudio,
  type NewWordVideo,
} from "../../lib/admin-api";
import { cn } from "../../lib/cn";
import { CEFR_LEVELS } from "../../lib/levels";
import type { WordVideo } from "../../lib/video-sources";
import { PART_OF_SPEECH_LABELS, type PartOfSpeech } from "../../lib/word-details";
import { ImagePicker, type PickedImage } from "./image-picker";
import { SoundField, type SoundItem } from "./sound-field";
import { VideoField } from "./video-field";
import { RelationList, SentenceList } from "./word-extras";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type WordEditorProps = {
  /** Word being edited; omit to create a new one. */
  word?: AdminWord;
  collections: Array<{ id: string; name: string }>;
  initialCollectionId?: string;
  onSaved: (word: AdminWord, collectionId: string) => void;
  /** Called when media is deleted or generated in place, before the form is saved. */
  onMediaChange?: (word: AdminWord) => void;
  /** Removes the word from the collection it is being edited in; shows the action when provided. */
  onRemove?: () => Promise<void>;
  onCancel: () => void;
  className?: string;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 rounded-xl border border-line p-3.5">
      <legend className="px-1.5 text-xs font-extrabold text-teal-dark">{title}</legend>
      {children}
    </fieldset>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <IconButton label={label} tone="plain" className="absolute top-1.5 right-1.5 size-6 bg-ink/80 text-xs text-paper hover:bg-danger" onClick={onClick}>✕</IconButton>;
}

export function WordEditor({ word, collections, initialCollectionId = "", onSaved, onMediaChange, onRemove, onCancel, className }: WordEditorProps) {
  const { session } = useAuth();
  // Set once the word exists on the server, so a retry after a failed upload updates instead of re-creating.
  const [persisted, setPersisted] = useState(word);
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  const [term, setTerm] = useState(word?.term ?? "");
  const [translation, setTranslation] = useState(word?.translationEs ?? "");
  const [level, setLevel] = useState(word?.level ?? CEFR_LEVELS[0]);
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech | "">(word?.partOfSpeech ?? "");
  const [frequencyRank, setFrequencyRank] = useState(word?.frequencyRank ? String(word.frequencyRank) : "");
  const [collectionId, setCollectionId] = useState(initialCollectionId);
  const [newImages, setNewImages] = useState<PickedImage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  // Sounds and videos picked before the word exists, stored right after it is created.
  const [pendingSounds, setPendingSounds] = useState<NewWordAudio[]>([]);
  const [pendingVideos, setPendingVideos] = useState<NewWordVideo[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const save = useAsyncAction();

  useEffect(() => {
    if (!imageFile) {
      setFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  /** Applies a change to the latest copy of the saved word and tells the parent list. */
  const applyToPersisted = (apply: (current: AdminWord) => AdminWord) => {
    const current = persistedRef.current;
    if (!current) return;
    const next = apply(current);
    setPersisted(next);
    onMediaChange?.(next);
  };

  /**
   * Runs an immediate media request on the saved word and applies its result to
   * the latest copy of the word, reporting failures inline.
   */
  const mutateMedia = async <T,>(request: (session: Session) => Promise<T>, apply: (current: AdminWord, result: T) => AdminWord, fallback: string) => {
    if (!session) return;
    setMediaError(null);
    try {
      const result = await request(session);
      applyToPersisted((current) => apply(current, result));
    } catch (error) {
      setMediaError(errorMessage(error, fallback));
    }
  };

  // Sound and video actions: immediate for a saved word, remembered until creation otherwise.
  // Failures reject so the field reports them next to the control that caused them.
  const addSound = async (audio: NewWordAudio) => {
    const current = persistedRef.current;
    if (!current) {
      setPendingSounds((pending) => [...pending, audio]);
      return;
    }
    if (!session) return;
    const saved = await addWordAudio(session, current.id, audio);
    applyToPersisted((word) => ({ ...word, audios: [...word.audios, saved] }));
  };

  const removeSound = async (sound: SoundItem) => {
    const { id } = sound;
    if (!id) {
      setPendingSounds((pending) => pending.filter((item) => item.url !== sound.url));
      return;
    }
    if (!session) return;
    await deleteWordAudio(session, id);
    applyToPersisted((word) => ({ ...word, audios: word.audios.filter((item) => item.id !== id) }));
  };

  const generateSound = async (accent: "US" | "UK") => {
    const current = persistedRef.current;
    if (!session || !current) return;
    const audio = await generateWordAudio(session, current.id, accent);
    applyToPersisted((word) => ({ ...word, audios: [...word.audios, audio] }));
  };

  const addVideo = async (video: NewWordVideo) => {
    const current = persistedRef.current;
    if (!current) {
      setPendingVideos((pending) => [...pending, video]);
      return;
    }
    if (!session) return;
    const saved = await addWordVideo(session, current.id, video);
    applyToPersisted((word) => ({ ...word, videos: [...word.videos, saved] }));
  };

  const removeVideo = async (video: WordVideo) => {
    const { id } = video;
    if (!id) {
      setPendingVideos((pending) => pending.filter((item) => item.url !== video.url));
      return;
    }
    if (!session) return;
    await deleteWordVideo(session, id);
    applyToPersisted((word) => ({ ...word, videos: word.videos.filter((item) => item.id !== id) }));
  };

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) setMediaError("Solo se permiten imágenes.");
    else if (file.size > MAX_UPLOAD_BYTES) setMediaError("La imagen no puede superar 10 MB.");
    else {
      setImageFile(file);
      setMediaError(null);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    let result: AdminWord | undefined;
    const saved = await save.run(async () => {
      const fields = { term: term.trim(), translationEs: translation.trim(), level, partOfSpeech: partOfSpeech || null, frequencyRank: frequencyRank ? Number(frequencyRank) : null, images: newImages.map(({ previewUrl: _previewUrl, ...image }) => image) };
      let current = persisted ? await updateWord(session, persisted.id, fields) : await createWord(session, collectionId, fields);
      setPersisted(current);
      setNewImages([]);
      // The word itself is saved; keep the list in sync even if a later upload fails.
      if (word) onMediaChange?.(current);

      if (imageFile) {
        const image = await uploadWordImage(session, current.id, imageFile);
        current = { ...current, images: [...current.images, image] };
        setPersisted(current);
        setImageFile(null);
      }
      for (const sound of pendingSounds) {
        // A word reused from another collection may already have this sound.
        if (!current.audios.some((audio) => audio.url === sound.url)) {
          const audio = await addWordAudio(session, current.id, sound);
          current = { ...current, audios: [...current.audios, audio] };
          setPersisted(current);
        }
        setPendingSounds((pending) => pending.filter((item) => item.url !== sound.url));
      }
      for (const video of pendingVideos) {
        if (!current.videos.some((item) => item.url === video.url)) {
          const saved = await addWordVideo(session, current.id, video);
          current = { ...current, videos: [...current.videos, saved] };
          setPersisted(current);
        }
        setPendingVideos((pending) => pending.filter((item) => item.url !== video.url));
      }
      result = current;
    }, "No se pudo guardar la palabra.");
    if (saved && result) onSaved(result, collectionId);
  };

  const images = persisted?.images ?? [];

  return (
    <form className={cn("grid gap-4", className)} onSubmit={(event) => void submit(event)}>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <Field label="Palabra">
          <Input required maxLength={100} value={term} onChange={(event) => setTerm(event.target.value)} placeholder="apple" />
        </Field>
        <Field label="Traducción">
          <Input required maxLength={200} value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="manzana" />
        </Field>
        <Field label="Nivel">
          <Select value={level} onChange={(event) => setLevel(event.target.value)}>
            {CEFR_LEVELS.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Categoría gramatical">
          <Select value={partOfSpeech} onChange={(event) => setPartOfSpeech(event.target.value as PartOfSpeech | "")}>
            <option value="">Sin especificar</option>
            {Object.entries(PART_OF_SPEECH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Frecuencia de uso" hint="Opcional. Posición en un corpus: 1 es la palabra más usada.">
          <Input type="number" inputMode="numeric" min={1} max={1000000} step={1} value={frequencyRank} onChange={(event) => setFrequencyRank(event.target.value)} placeholder="350" />
        </Field>
      </div>
      {persisted ? null : (
        <Field label="Colección">
          <Select required value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
            <option value="">Selecciona una colección</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </Select>
        </Field>
      )}

      <Section title="Imágenes">
        {images.length ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2.5 p-0">
            {images.map((image) => (
              <li key={image.id} className="relative">
                <a href={image.url} target="_blank" rel="noreferrer" title="Abrir imagen">
                  <img className="aspect-[5/4] w-full rounded-lg bg-teal-soft object-cover" src={image.url} alt={`Imagen de ${term}`} />
                </a>
                <RemoveButton
                  label="Eliminar imagen"
                  onClick={() => void mutateMedia(
                    (current) => deleteWordImage(current, image.id),
                    (current) => ({ ...current, images: current.images.filter((item) => item.id !== image.id) }),
                    "No se pudo eliminar la imagen.",
                  )}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <ImagePicker value={newImages} onChange={setNewImages} defaultQuery={term} />
        <label onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line bg-paper/60 p-3 text-sm transition-colors hover:border-teal hover:bg-teal-soft/40">
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
          {filePreview ? <img className="h-14 w-20 shrink-0 rounded-lg object-cover" src={filePreview} alt="Vista previa de la imagen" /> : <span aria-hidden="true" className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-teal-soft text-xl text-teal-dark">↥</span>}
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{imageFile ? imageFile.name : "Subir una imagen propia"}</strong>
            <small className="text-xs text-muted">Arrastra un archivo o pulsa para elegirlo · máximo 10 MB</small>
          </span>
          {imageFile ? (
            <Button variant="ghost" size="sm" onClick={(event) => { event.preventDefault(); setImageFile(null); }}>Quitar</Button>
          ) : null}
        </label>
      </Section>

      <SoundField session={session} term={term} sounds={persisted?.audios ?? pendingSounds} onAdd={addSound} onRemove={removeSound} onGenerate={persisted ? generateSound : undefined} />

      <Section title="Oraciones de ejemplo">
        {persisted ? <SentenceList word={persisted} mutate={mutateMedia} /> : <p className="m-0 text-xs text-muted">Podrás añadir oraciones después de guardar la palabra.</p>}
      </Section>

      <Section title="Palabras relacionadas">
        {persisted ? <RelationList word={persisted} mutate={mutateMedia} /> : <p className="m-0 text-xs text-muted">Podrás enlazar sinónimos y antónimos después de guardar la palabra.</p>}
      </Section>

      <VideoField session={session} term={term} videos={persisted?.videos ?? pendingVideos} onAdd={addVideo} onRemove={removeVideo} />

      {mediaError ? <Alert>{mediaError}</Alert> : null}
      {save.error ? <Alert>{save.error}</Alert> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onRemove ? (
          <span className="mr-auto">
            <ConfirmButton
              confirmLabel="Sí, quitar palabra"
              isLoading={isRemoving}
              onConfirm={() => {
                setIsRemoving(true);
                void onRemove().finally(() => setIsRemoving(false));
              }}
            >
              Quitar de la colección
            </ConfirmButton>
          </span>
        ) : null}
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" isLoading={save.isPending} loadingLabel="Guardando...">Guardar palabra</Button>
      </div>
    </form>
  );
}
