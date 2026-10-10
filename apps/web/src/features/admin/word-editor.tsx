import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Alert, Button, ConfirmButton, Field, IconButton, Input, Select } from "../../components/ui";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "../../contexts/auth-context";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import {
  addWordMedia,
  createWord,
  deleteWordAudio,
  deleteWordImage,
  deleteWordVideo,
  generateWordAudio,
  updateWord,
  uploadWordImage,
  type AdminWord,
} from "../../lib/admin-api";
import { cn } from "../../lib/cn";
import { CEFR_LEVELS } from "../../lib/levels";
import { ImagePicker, type PickedImage } from "./image-picker";

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
  return <IconButton label={label} tone="plain" className="absolute top-1.5 right-1.5 size-6 bg-ink/80 text-xs text-white hover:bg-danger" onClick={onClick}>✕</IconButton>;
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
  const [collectionId, setCollectionId] = useState(initialCollectionId);
  const [newImages, setNewImages] = useState<PickedImage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [audioAccent, setAudioAccent] = useState<"US" | "UK">("US");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
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

  /**
   * Runs an immediate media request on the saved word and applies its result to
   * the latest copy of the word, reporting failures inline.
   */
  const mutateMedia = async <T,>(request: (session: Session) => Promise<T>, apply: (current: AdminWord, result: T) => AdminWord, fallback: string) => {
    if (!session) return;
    setMediaError(null);
    try {
      const result = await request(session);
      const current = persistedRef.current;
      if (!current) return;
      const next = apply(current, result);
      setPersisted(next);
      onMediaChange?.(next);
    } catch (error) {
      setMediaError(errorMessage(error, fallback));
    }
  };

  const generateAudio = async (wordId: string) => {
    setIsGeneratingAudio(true);
    await mutateMedia(
      (current) => generateWordAudio(current, wordId, audioAccent),
      (current, audio) => ({ ...current, audios: [...current.audios, audio] }),
      "No se pudo generar el audio.",
    );
    setIsGeneratingAudio(false);
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
      const fields = { term: term.trim(), translationEs: translation.trim(), level, images: newImages.map(({ previewUrl: _previewUrl, ...image }) => image) };
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
      if (videoUrl.trim()) {
        const video = await addWordMedia(session, current.id, "video", videoUrl.trim());
        current = { ...current, videos: [...current.videos, video] };
        setPersisted(current);
        setVideoUrl("");
      }
      if (audioUrl.trim()) {
        const audio = await addWordMedia(session, current.id, "audio", audioUrl.trim());
        current = { ...current, audios: [...current.audios, audio] };
        setPersisted(current);
        setAudioUrl("");
      }
      result = current;
    }, "No se pudo guardar la palabra.");
    if (saved && result) onSaved(result, collectionId);
  };

  const images = persisted?.images ?? [];
  const audios = persisted?.audios ?? [];
  const videos = persisted?.videos ?? [];

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

      <Section title="Sonido">
        {persisted ? (
          <>
            {audios.length ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {audios.map((audio) => (
                  <li key={audio.id} className="flex flex-wrap items-center gap-2">
                    <audio className="h-9 min-w-0 flex-1" controls src={audio.url} aria-label={`Pronunciación de ${term}`} />
                    <small className="text-xs text-muted">{audio.accent ?? "US"} · {audio.provider ?? "manual"}</small>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void mutateMedia(
                        (current) => deleteWordAudio(current, audio.id),
                        (current) => ({ ...current, audios: current.audios.filter((item) => item.id !== audio.id) }),
                        "No se pudo eliminar el sonido.",
                      )}
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : <p className="m-0 text-xs text-muted">No hay sonido guardado.</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Select className="w-auto" aria-label="Acento" value={audioAccent} onChange={(event) => setAudioAccent(event.target.value as "US" | "UK")}>
                <option value="US">Voz US</option>
                <option value="UK">Voz UK</option>
              </Select>
              <Button variant="secondary" isLoading={isGeneratingAudio} loadingLabel="Generando..." onClick={() => void generateAudio(persisted.id)}>
                {audios.length ? "Generar otro sonido" : "Generar sonido"}
              </Button>
            </div>
          </>
        ) : <p className="m-0 text-xs text-muted">Podrás generar la pronunciación después de guardar la palabra.</p>}
        <Input type="url" aria-label="Enlace de audio" placeholder="…o pega el enlace de un audio (https://...)" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} />
      </Section>

      <Section title="Videos">
        {videos.length ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2.5 p-0">
            {videos.map((video) => (
              <li key={video.id} className="relative min-w-0">
                <video className="aspect-video w-full rounded-lg bg-ink" controls preload="metadata" src={video.url} aria-label={`Video de ${term}`} />
                <a className="mt-1 block truncate text-[0.7rem] text-teal-dark" href={video.url} target="_blank" rel="noreferrer">{video.url}</a>
                <RemoveButton
                  label="Eliminar video"
                  onClick={() => void mutateMedia(
                    (current) => deleteWordVideo(current, video.id),
                    (current) => ({ ...current, videos: current.videos.filter((item) => item.id !== video.id) }),
                    "No se pudo eliminar el video.",
                  )}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <Input type="url" aria-label="Enlace de video" placeholder="Pega el enlace de un video (https://...)" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
      </Section>

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
