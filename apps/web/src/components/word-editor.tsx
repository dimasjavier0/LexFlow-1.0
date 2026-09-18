import { useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useAuth } from "../contexts/auth-context";

const apiUrl = import.meta.env.VITE_API_URL;
type CollectionOption = { id: string; name: string };
export type EditableWord = { id: string; term: string; translationEs: string; level: string; isPublished: boolean };

type WordEditorProps = {
  word?: EditableWord;
  collections: CollectionOption[];
  initialCollectionId?: string;
  onSaved: (word: EditableWord, collectionId: string) => void;
  onCancel: () => void;
};

export function WordEditor({ word, collections, initialCollectionId = "", onSaved, onCancel }: WordEditorProps) {
  const { session } = useAuth();
  const [term, setTerm] = useState(word?.term ?? "");
  const [translation, setTranslation] = useState(word?.translationEs ?? "");
  const [level, setLevel] = useState(word?.level ?? "A1");
  const [collectionId, setCollectionId] = useState(initialCollectionId);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrorMessage("Solo se permiten imágenes."); return; }
    if (file.size > 10 * 1024 * 1024) { setErrorMessage("La imagen no puede superar 10 MB."); return; }
    setImageFile(file);
    setErrorMessage(null);
  };

  const uploadFile = async (wordId: string) => {
    if (!imageFile || !session) return;
    const data = new FormData();
    data.append("image", imageFile);
    const response = await fetch(`${apiUrl}/admin/words/${wordId}/images`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: data });
    if (!response.ok) throw new Error("La palabra se guardó, pero la imagen no pudo subirse.");
  };

  const saveImageLink = async (wordId: string) => {
    if (!imageUrl || !session) return;
    const response = await fetch(`${apiUrl}/admin/words/${wordId}/media`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "image", url: imageUrl }) });
    if (!response.ok) throw new Error("La palabra se guardó, pero el enlace de imagen no pudo guardarse.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || (!word && !collectionId)) { setErrorMessage("Selecciona una colección."); return; }
    setIsSaving(true); setErrorMessage(null);
    try {
      const endpoint = word ? `/admin/words/${word.id}` : `/admin/collections/${collectionId}/words`;
      const response = await fetch(`${apiUrl}${endpoint}`, { method: word ? "PATCH" : "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ term, translationEs: translation, level, isPublished: word?.isPublished ?? false }) });
      if (!response.ok) throw new Error("No se pudo guardar la palabra.");
      const body = await response.json() as { word: EditableWord | { word: EditableWord } };
      const savedWord = "word" in body.word ? body.word.word : body.word;
      await uploadFile(savedWord.id);
      await saveImageLink(savedWord.id);
      onSaved(savedWord, collectionId);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la palabra."); }
    finally { setIsSaving(false); }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0]);

  return <form className="admin-form word-editor" onSubmit={(event) => void submit(event)}>
    <div className="editor-heading"><div><p className="eyebrow">{word ? "EDITAR PALABRA" : "NUEVA PALABRA"}</p><h3>{word ? word.term : "Crear palabra"}</h3></div><button className="modal-close" type="button" onClick={onCancel} aria-label="Cerrar">×</button></div>
    <div className="form-grid"><label>Palabra<input required value={term} onChange={(event) => setTerm(event.target.value)} placeholder="apple" /></label><label>Traducción<input required value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="manzana" /></label><label>Nivel<select value={level} onChange={(event) => setLevel(event.target.value)}>{["A1", "A2", "B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
    {!word ? <label>Colección<select required value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Selecciona una colección</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label> : null}
    <label>Enlace de imagen<input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label>
    <div className="drop-zone compact-drop" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input id={`image-${word?.id ?? "new"}`} type="file" accept="image/*" onChange={onFileChange} /><label htmlFor={`image-${word?.id ?? "new"}`}><strong>{imageFile ? imageFile.name : "Arrastra una imagen aquí"}</strong><small>o pulsa para seleccionar · máximo 10 MB</small></label></div>
    {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
    <div className="editor-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar palabra"}</button></div>
  </form>;
}
