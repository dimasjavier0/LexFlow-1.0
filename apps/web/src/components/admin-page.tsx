import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

const apiUrl = import.meta.env.VITE_API_URL;

export function AdminPage() {
  const { apiUser, isLoading, isSyncingUser, session } = useAuth();
  const [collections, setCollections] = useState<Array<{ id: string; name: string; slug: string; isPublished: boolean }>>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [words, setWords] = useState<Array<{ position: number; word: { id: string; term: string; translationEs: string; level: string; isPublished: boolean } }>>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [term, setTerm] = useState("");
  const [translationEs, setTranslationEs] = useState("");
  const [level, setLevel] = useState("A1");
  const [selectedWordId, setSelectedWordId] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session || apiUser?.role !== "ADMIN") return;
    void fetch(`${apiUrl}/admin/collections`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.json() as Promise<{ collections: typeof collections }>)
      .then((body) => setCollections(body.collections));
  }, [apiUser?.role, session]);

  useEffect(() => {
    if (!session || !selectedCollectionId) {
      setWords([]);
      return;
    }
    void fetch(`${apiUrl}/admin/collections/${selectedCollectionId}/words`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.json() as Promise<{ words: typeof words }>)
      .then((body) => setWords(body.words));
  }, [selectedCollectionId, session]);

  if (isLoading || isSyncingUser) return <main className="auth-page">Comprobando permisos...</main>;
  if (apiUser?.role !== "ADMIN") return <Navigate to="/" replace />;

  const createCollection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    const response = await fetch(`${apiUrl}/admin/collections`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, isPublished: false }),
    });
    if (!response.ok) {
      setMessage("No se pudo crear la colección.");
      return;
    }
    const body = (await response.json()) as { collection: (typeof collections)[number] };
    setCollections((current) => [body.collection, ...current]);
    setName("");
    setSlug("");
    setMessage("Colección creada.");
  };

  const createWord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !selectedCollectionId) return;
    const response = await fetch(`${apiUrl}/admin/collections/${selectedCollectionId}/words`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ term, translationEs, level, isPublished: false }),
    });
    if (!response.ok) {
      setMessage("No se pudo crear o asociar la palabra.");
      return;
    }
    const body = (await response.json()) as { word: (typeof words)[number] };
    setWords((current) => [...current, body.word]);
    setTerm("");
    setTranslationEs("");
    setMessage("Palabra añadida.");
  };

  const togglePublication = async (kind: "collection" | "word", id: string, isPublished: boolean) => {
    if (!session) return;
    const path = kind === "collection" ? `/admin/collections/${id}/publication` : `/admin/words/${id}/publication`;
    const response = await fetch(`${apiUrl}${path}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !isPublished }),
    });
    if (!response.ok) {
      setMessage("No se pudo cambiar la publicación.");
      return;
    }
    if (kind === "collection") setCollections((current) => current.map((item) => item.id === id ? { ...item, isPublished: !isPublished } : item));
    else setWords((current) => current.map((item) => item.word.id === id ? { ...item, word: { ...item.word, isPublished: !isPublished } } : item));
    setMessage("Publicación actualizada.");
  };

  const createMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !selectedWordId) return;
    const response = await fetch(`${apiUrl}/admin/words/${selectedWordId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: mediaType, url: mediaUrl }),
    });
    setMessage(response.ok ? "Recurso añadido." : "No se pudo añadir el recurso.");
    if (response.ok) setMediaUrl("");
  };

  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
    <p className="eyebrow">ADMIN</p>
    <h1 className="mt-2 text-4xl font-bold text-slate-950">Colecciones</h1>
    <form className="admin-form" onSubmit={(event) => void createCollection(event)}>
      <input required placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <input required placeholder="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
      <button className="primary-button" type="submit">Crear colección</button>
    </form>
    {message ? <p className="mt-4 text-slate-600">{message}</p> : null}
    <ul className="admin-list">{collections.map((collection) => <li key={collection.id}><strong>{collection.name}</strong><span>{collection.slug} · {collection.isPublished ? "Publicada" : "Borrador"} <button className="inline-action" onClick={() => void togglePublication("collection", collection.id, collection.isPublished)}>{collection.isPublished ? "Ocultar" : "Publicar"}</button></span></li>)}</ul>
    <section className="admin-section">
      <h2 className="text-2xl font-semibold text-slate-950">Palabras</h2>
      <select className="admin-select" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)}>
        <option value="">Selecciona una colección</option>
        {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
      </select>
      {selectedCollectionId ? <form className="admin-form" onSubmit={(event) => void createWord(event)}>
        <input required placeholder="Palabra en inglés" value={term} onChange={(event) => setTerm(event.target.value)} />
        <input required placeholder="Traducción al español" value={translationEs} onChange={(event) => setTranslationEs(event.target.value)} />
        <select className="admin-select" value={level} onChange={(event) => setLevel(event.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select>
        <button className="primary-button" type="submit">Añadir palabra</button>
      </form> : null}
      <ul className="admin-list">{words.map(({ word }) => <li key={word.id}><strong>{word.term}</strong><span>{word.translationEs} · {word.level} · {word.isPublished ? "Publicada" : "Borrador"} <button className="inline-action" onClick={() => void togglePublication("word", word.id, word.isPublished)}>{word.isPublished ? "Ocultar" : "Publicar"}</button><button className="inline-action" onClick={() => setSelectedWordId(word.id)}>Multimedia</button></span></li>)}</ul>
      {selectedWordId ? <form className="admin-form" onSubmit={(event) => void createMedia(event)}><h3 className="text-xl font-semibold text-slate-950">Añadir recurso</h3><select className="admin-select" value={mediaType} onChange={(event) => setMediaType(event.target.value)}><option value="image">Imagen</option><option value="audio">Audio</option><option value="video">Video</option></select><input required type="url" placeholder="URL del recurso" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} /><button className="primary-button" type="submit">Guardar recurso</button></form> : null}
    </section>
  </main>;
}