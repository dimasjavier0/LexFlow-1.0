import { useState, type FormEvent } from "react";
import { PixabayPicker, type PixabayImage } from "../../components/pixabay-picker";
import { Alert, Button, Field, Input, Modal, Textarea } from "../../components/ui";
import { useAsyncAction } from "../../hooks/use-async-action";
import { createCollection, updateCollection, type AdminCollection } from "../../lib/admin-api";
import { slugify } from "../../lib/slug";
import type { AdminLibrary } from "./use-admin-library";

type CollectionFormModalProps = {
  /** Collection being edited; omit to create a new one. */
  collection?: AdminCollection;
  library: AdminLibrary;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function CollectionFormModal({ collection, library, onClose, onSaved }: CollectionFormModalProps) {
  const [name, setName] = useState(collection?.name ?? "");
  // Until the admin types a slug of their own, it follows the name.
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [description, setDescription] = useState(collection?.description ?? "");
  const [imageUrl, setImageUrl] = useState(collection?.imageUrl ?? "");
  const [pixabayImages, setPixabayImages] = useState<PixabayImage[]>([]);
  const save = useAsyncAction();
  const isEditing = collection !== undefined;
  const slug = customSlug ?? slugify(name);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const { session } = library;
    if (!session) return;
    const cover = imageUrl.trim() || pixabayImages[0]?.url || null;
    const details = { name: name.trim(), description: description.trim() || null, imageUrl: cover };
    const saved = await save.run(async () => {
      if (collection) await updateCollection(session, collection.id, details);
      else await createCollection(session, { ...details, slug });
      await library.reloadCollections();
    }, "No se pudo guardar la colección.");
    if (saved) onSaved(isEditing ? "Colección actualizada." : "Colección creada.");
  };

  return (
    <Modal title={isEditing ? "Editar colección" : "Nueva colección"} eyebrow={isEditing ? "Colección" : "Estructura"} onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="Nombre">
          <Input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Colors" />
        </Field>
        {isEditing ? null : (
          <Field label="Slug" hint={`Se genera a partir del nombre. La colección se abrirá en /learn/${slug || "..."}`}>
            <Input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => setCustomSlug(event.target.value)} placeholder="colors" />
          </Field>
        )}
        <Field label="Descripción" hint="Opcional. Se muestra en la tarjeta de la colección.">
          <Textarea rows={2} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Vocabulario básico de colores" />
        </Field>
        <Field label="Imagen de portada">
          <Input type="text" inputMode="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
        </Field>
        {imageUrl ? <img className="max-h-44 w-full rounded-xl bg-teal-soft object-cover" src={imageUrl} alt="Vista previa de la colección" /> : null}
        <PixabayPicker imageUrl={imageUrl} onImageUrlChange={setImageUrl} selectedImages={pixabayImages} onSelectedImagesChange={setPixabayImages} />
        {save.error ? <Alert>{save.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={save.isPending} loadingLabel="Guardando...">{isEditing ? "Guardar cambios" : "Crear colección"}</Button>
        </div>
      </form>
    </Modal>
  );
}
