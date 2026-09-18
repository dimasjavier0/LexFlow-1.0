import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

const apiUrl = import.meta.env.VITE_API_URL;
type Collection = { id: string; name: string; slug: string; description: string | null; isPublished: boolean; _count: { words: number } };
type Word = { id: string; term: string; translationEs: string; level: string; isPublished: boolean };

async function readBody<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("No se pudo completar la operación.");
  return (await response.json()) as T;
}

export function AdminDashboard() {
  const { apiUser, isLoading, isSyncingUser, session } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [wordsByCollection, setWordsByCollection] = useState<Record<string, Word[]>>({});
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [level, setLevel] = useState("A1");
  const [wordCollectionId, setWordCollectionId] = useState("");
  const [uploading, setUploading] = useState(false);

  const headers = () => ({ Authorization: `Bearer ${session?.access_token ?? ""}` });

  const loadCollections = async () => {
    if (!session) return;
    const body = await readBody<{ collections: Collection[] }>(await fetch(`${apiUrl}/admin/collections`, { headers: headers() }));
    setCollections(body.collections);
  };

  useEffect(() => { void loadCollections().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No se pudieron cargar las colecciones.")); }, [session]);

  if (isLoading || isSyncingUser) return <main className="auth-page">Comprobando permisos...</main>;
  if (apiUser?.role !== "ADMIN") return <Navigate to="/" replace />;

  const toggleCollection = async (collection: Collection) => {
    const nextExpanded = !expanded[collection.id];
    setExpanded((current) => ({ ...current, [collection.id]: nextExpanded }));
    if (!nextExpanded || wordsByCollection[collection.id] || !session) return;
    const body = await readBody<{ words: Array<{ word: Word }> }>(await fetch(`${apiUrl}/admin/collections/${collection.id}/words`, { headers: headers() }));
    setWordsByCollection((current) => ({ ...current, [collection.id]: body.words.map((item) => item.word) }));
  };

  const createCollection = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    try {
      await readBody(await fetch(`${apiUrl}/admin/collections`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ name: collectionName, slug: collectionSlug, isPublished: false }) }));
      setCollectionName(""); setCollectionSlug(""); setMessage("Colección creada."); await loadCollections();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear la colección."); }
  };

  const createWord = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !wordCollectionId) return;
    try {
      const body = await readBody<{ word: { word: Word } }>(await fetch(`${apiUrl}/admin/collections/${wordCollectionId}/words`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ term, translationEs: translation, level, isPublished: false }) }));
      setWordsByCollection((current) => ({ ...current, [wordCollectionId]: [...(current[wordCollectionId] ?? []), body.word.word] }));
      setTerm(""); setTranslation(""); setMessage("Palabra enlazada a la colección.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo añadir la palabra."); }
  };

  const uploadImage = async (file: File) => {
    if (!session || !selectedWord) return;
    if (!file.type.startsWith("image/")) { setMessage("Solo se permiten imágenes."); return; }
    setUploading(true);
    const formData = new FormData(); formData.append("image", file);
    try { await readBody(await fetch(`${apiUrl}/admin/words/${selectedWord.id}/images`, { method: "POST", headers: headers(), body: formData })); setMessage("Imagen guardada en la base de datos."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo subir la imagen."); }
    finally { setUploading(false); }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void uploadImage(file); };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); };

  return <main className="admin-shell">
    <header className="admin-header"><div><p className="eyebrow">LEXFLOW / ADMIN</p><h1>Centro de contenido</h1><p>Organiza colecciones, palabras y recursos.</p></div><span className="role-badge">ADMIN</span></header>
    {message ? <p className="admin-message">{message}</p> : null}
    <section className="action-grid">
      <a className="action-card action-card-active" href="#explore"><span className="action-icon">⌘</span><strong>Explorar colecciones</strong><small>Abre cada colección y revisa sus palabras.</small></a>
      <a className="action-card" href="#new-word"><span className="action-icon">＋</span><strong>Nueva palabra</strong><small>Crea una palabra y enlázala después.</small></a>
      <a className="action-card" href="#new-collection"><span className="action-icon">▦</span><strong>Nueva colección</strong><small>Prepara una nueva unidad de estudio.</small></a>
    </section>
    <section id="explore" className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">BIBLIOTECA</p><h2>Colecciones</h2></div><span>{collections.length} total</span></div>
      <div className="collection-stack">{collections.map((collection) => <div className="collection-item" key={collection.id}>
        <button className="collection-toggle" onClick={() => void toggleCollection(collection)}><span className="chevron">{expanded[collection.id] ? "⌄" : "›"}</span><span><strong>{collection.name}</strong><small>{collection.slug} · {collection._count.words} palabras</small></span><em>{collection.isPublished ? "Publicada" : "Borrador"}</em></button>
        {expanded[collection.id] ? <div className="nested-words">{(wordsByCollection[collection.id] ?? []).map((word) => <button className="word-row" key={word.id} onClick={() => setSelectedWord(word)}><span><strong>{word.term}</strong><small>{word.translationEs} · {word.level}</small></span><span>{word.isPublished ? "Publicado" : "Borrador"}</span></button>)}{(wordsByCollection[collection.id] ?? []).length === 0 ? <p className="empty-state">Esta colección todavía no tiene palabras.</p> : null}</div> : null}
      </div>)}</div>
    </section>
    <section id="new-word" className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">CONTENIDO</p><h2>Nueva palabra</h2></div><span>1. Crear · 2. Enlazar</span></div><form className="admin-form admin-form-wide" onSubmit={(event) => void createWord(event)}><div className="form-grid"><label>Palabra<input required value={term} onChange={(event) => setTerm(event.target.value)} placeholder="apple" /></label><label>Traducción<input required value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="manzana" /></label><label>Nivel<select value={level} onChange={(event) => setLevel(event.target.value)}>{["A1", "A2", "B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Colección a enlazar<select required value={wordCollectionId} onChange={(event) => setWordCollectionId(event.target.value)}><option value="">Selecciona una colección</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><button className="primary-button" type="submit">Crear y enlazar palabra</button></form></section>
    <section id="new-collection" className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">ESTRUCTURA</p><h2>Nueva colección</h2></div></div><form className="admin-form admin-form-wide" onSubmit={(event) => void createCollection(event)}><div className="form-grid"><label>Nombre<input required value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="Colors" /></label><label>Slug<input required value={collectionSlug} onChange={(event) => setCollectionSlug(event.target.value)} placeholder="colors" /></label></div><button className="primary-button" type="submit">Crear colección</button></form></section>
    <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">RECURSOS</p><h2>{selectedWord ? `Imagen para ${selectedWord.term}` : "Selecciona una palabra"}</h2></div></div>{selectedWord ? <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input id="image-file" type="file" accept="image/*" onChange={onFileChange} /><label htmlFor="image-file"><strong>{uploading ? "Guardando imagen..." : "Arrastra una imagen aquí"}</strong><small>o pulsa para elegir un archivo · máximo 10 MB</small></label></div> : <p className="empty-state">Expande una colección y selecciona una palabra para cargar su imagen.</p>}</section>
  </main>;
}