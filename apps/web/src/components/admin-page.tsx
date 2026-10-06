import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

const apiUrl = import.meta.env.VITE_API_URL;
type PixabayImage = { id: number; previewUrl: string; url: string; pageUrl: string; tags: string; user: string };

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
  const [pixabayImages, setPixabayImages] = useState<PixabayImage[]>([]);
  const [selectedPixabayImages, setSelectedPixabayImages] = useState<PixabayImage[]>([]);
  const [pixabayPage, setPixabayPage] = useState(1);
  const [isSearchingPixabay, setIsSearchingPixabay] = useState(false);

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
      body: JSON.stringify({
        term,
        translationEs,
        level,
        isPublished: false,
        images: selectedPixabayImages.map((image) => ({
          url: image.url,
          attribution: `Pixabay: ${image.user}`,
          metadata: { id: image.id, pageUrl: image.pageUrl, tags: image.tags },
        })),
      }),
    });
    if (!response.ok) {
      setMessage("No se pudo crear o asociar la palabra.");
      return;
    }
    const body = (await response.json()) as { word: (typeof words)[number] };
    setWords((current) => [...current, body.word]);
    setTerm("");
    setTranslationEs("");
    setPixabayImages([]);
    setSelectedPixabayImages([]);
    setPixabayPage(1);
    setMessage("Palabra añadida.");
  };

  const searchPixabay = async (page = 1) => {
    if (!session || !term.trim()) return;
    setIsSearchingPixabay(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/admin/pixabay/images?q=${encodeURIComponent(term.trim())}&page=${page}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json() as { images?: PixabayImage[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "No se pudieron buscar imágenes.");
      setPixabayImages(body.images ?? []);
      setPixabayPage(page);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron buscar imágenes.");
    } finally {
      setIsSearchingPixabay(false);
    }
  };

  const selectPixabayImage = (image: PixabayImage) => {
    setSelectedPixabayImages((current) => current.some((selected) => selected.id === image.id) || current.length >= 4 ? current : [...current, image]);
    setPixabayImages((current) => current.filter((option) => option.id !== image.id));
  };

  const removeSelectedPixabayImage = (image: PixabayImage) => {
    setSelectedPixabayImages((current) => current.filter((selected) => selected.id !== image.id));
    setPixabayImages((current) => current.some((option) => option.id === image.id) ? current : [image, ...current].slice(0, 4));
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
        <div className="word-search-input"><input required placeholder="Palabra en inglés" value={term} onChange={(event) => setTerm(event.target.value)} /><button type="button" aria-label="Buscar imágenes en Pixabay" onClick={() => void searchPixabay()} disabled={isSearchingPixabay || !term.trim()}>⌕</button></div>
        <input required placeholder="Traducción al español" value={translationEs} onChange={(event) => setTranslationEs(event.target.value)} />
        <select className="admin-select" value={level} onChange={(event) => setLevel(event.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select>
        {(pixabayImages.length || selectedPixabayImages.length) ? <div className="pixabay-picker">
          <div className="pixabay-row pixabay-selected-row">{selectedPixabayImages.map((image) => <button key={image.id} type="button" className="pixabay-image-button selected" onClick={() => removeSelectedPixabayImage(image)} title="Quitar imagen"><img src={image.previewUrl} alt={image.tags} /></button>)}</div>
          <div className="pixabay-row pixabay-options-row"><button type="button" className="pixabay-arrow" onClick={() => void searchPixabay(Math.max(1, pixabayPage - 1))} disabled={isSearchingPixabay || pixabayPage === 1} aria-label="Imágenes anteriores">←</button>{pixabayImages.map((image) => <button key={image.id} type="button" className="pixabay-image-button" onClick={() => selectPixabayImage(image)} title={`Seleccionar imagen de ${image.user}`}><img src={image.previewUrl} alt={image.tags} /></button>)}<button type="button" className="pixabay-arrow" onClick={() => void searchPixabay(pixabayPage + 1)} disabled={isSearchingPixabay || pixabayImages.length === 0} aria-label="Más imágenes">→</button></div>
          <small>Imágenes de Pixabay · seleccionadas: {selectedPixabayImages.length}/4</small>
        </div> : null}
        <button className="primary-button" type="submit">Añadir palabra</button>
      </form> : null}
      <ul className="admin-list">{words.map(({ word }) => <li key={word.id}><strong>{word.term}</strong><span>{word.translationEs} · {word.level} · {word.isPublished ? "Publicada" : "Borrador"} <button className="inline-action" onClick={() => void togglePublication("word", word.id, word.isPublished)}>{word.isPublished ? "Ocultar" : "Publicar"}</button><button className="inline-action" onClick={() => setSelectedWordId(word.id)}>Multimedia</button></span></li>)}</ul>
      {selectedWordId ? <form className="admin-form" onSubmit={(event) => void createMedia(event)}><h3 className="text-xl font-semibold text-slate-950">Añadir recurso</h3><select className="admin-select" value={mediaType} onChange={(event) => setMediaType(event.target.value)}><option value="image">Imagen</option><option value="audio">Audio</option><option value="video">Video</option></select><input required type="url" placeholder="URL del recurso" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} /><button className="primary-button" type="submit">Guardar recurso</button></form> : null}
    </section>
  </main>;
}