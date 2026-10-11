import { useState, type FormEvent } from "react";
import { Alert, Button, ConfirmButton, Field, Input, Modal, Textarea } from "../../components/ui";
import { useAsyncAction } from "../../hooks/use-async-action";
import { createCollection, deleteCollection, updateCollection, type AdminCollection } from "../../lib/admin-api";
import { slugify } from "../../lib/slug";
import { ImagePicker, type PickedImage } from "./image-picker";
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
  const [cover, setCover] = useState<PickedImage[]>(collection?.imageUrl ? [{ url: collection.imageUrl, previewUrl: collection.imageUrl, source: "manual" }] : []);
  const save = useAsyncAction();
  const remove = useAsyncAction();
  const isEditing = collection !== undefined;
  const slug = customSlug ?? slugify(name);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const { session } = library;
    if (!session) return;
    const details = { name: name.trim(), description: description.trim() || null, imageUrl: cover[0]?.url ?? null };
    const saved = await save.run(async () => {
      if (collection) await updateCollection(session, collection.id, details);
      else await createCollection(session, { ...details, slug });
      await library.reloadCollections();
    }, "No se pudo guardar la colección.");
    if (saved) onSaved(isEditing ? "Colección actualizada." : "Colección creada.");
  };

  const removeCollection = async () => {
    const { session } = library;
    if (!session || !collection) return;
    const removed = await remove.run(async () => {
      await deleteCollection(session, collection.id);
      await library.reloadCollections();
    }, "No se pudo eliminar la colección.");
    if (removed) onSaved(`“${collection.name}” eliminada.`);
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
        <ImagePicker value={cover} onChange={setCover} defaultQuery={name} max={1} />
        {save.error ? <Alert>{save.error}</Alert> : null}
        {remove.error ? <Alert>{remove.error}</Alert> : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isEditing ? (
            <span className="mr-auto" title="También se eliminan las palabras que no estén en otra colección">
              <ConfirmButton confirmLabel="Sí, eliminar colección y sus palabras" isLoading={remove.isPending} onConfirm={() => void removeCollection()}>Eliminar colección</ConfirmButton>
            </span>
          ) : null}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={save.isPending} loadingLabel="Guardando...">{isEditing ? "Guardar cambios" : "Crear colección"}</Button>
        </div>
      </form>
    </Modal>
  );
}
