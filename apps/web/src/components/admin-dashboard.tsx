import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { EditableWord, WordEditor } from "./word-editor";
import { PixabayPicker, type PixabayImage } from "./pixabay-picker";
import { AdminLayout } from "../layouts/admin-layout";

const apiUrl = import.meta.env.VITE_API_URL;
type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  _count: { words: number };
};

async function readBody<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("No se pudo completar la operación.");
  return (await response.json()) as T;
}

type BulkLine = { line: number; raw: string; term: string; translationEs: string; status: "valid" | "invalid" | "warning" | "empty"; message: string };
type MissingMediaPreview = { wordId: string; term: string; images: Array<{ url: string; attribution: string; metadata: Record<string, unknown> }>; audio: { url: string; provider: string; voice: string; accent: string; metadata: Record<string, unknown> } | null };

function parseBulkLines(value: string): BulkLine[] {
  const seen = new Set<string>();
  return value.split(/\r?\n/).map((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return { line, raw, term: "", translationEs: "", status: "empty", message: "Línea vacía" };
    const separator = trimmed.indexOf(",");
    if (separator < 1 || separator === trimmed.length - 1) return { line, raw, term: "", translationEs: "", status: "invalid", message: "Usa: palabra en inglés, traducción" };
    const term = trimmed.slice(0, separator).trim();
    const translationEs = trimmed.slice(separator + 1).trim();
    if (!term || !translationEs) return { line, raw, term, translationEs, status: "invalid", message: "Falta la palabra o la traducción" };
    const key = term.toLowerCase();
    if (seen.has(key)) return { line, raw, term, translationEs, status: "warning", message: "Palabra repetida; se omitirá el duplicado" };
    seen.add(key);
    return { line, raw, term, translationEs, status: "valid", message: "Línea válida" };
  });
}

export function AdminDashboard() {
  const { apiUser, isLoading, isSyncingUser, session } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [wordsByCollection, setWordsByCollection] = useState<
    Record<string, EditableWord[]>
  >({});
  const [editor, setEditor] = useState<{
    mode: "new" | "edit";
    word?: EditableWord;
    collectionId?: string;
  } | null>(null);
  const [modal, setModal] = useState<
    "collection" | "edit-collection" | "bulk-words" | null
  >(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [collectionImageUrl, setCollectionImageUrl] = useState("");
  const [collectionPixabayImages, setCollectionPixabayImages] = useState<PixabayImage[]>([]);
  const [bulkCollectionId, setBulkCollectionId] = useState("");
  const [bulkCollectionName, setBulkCollectionName] = useState("");
  const [bulkCollectionSlug, setBulkCollectionSlug] = useState("");
  const [bulkTerms, setBulkTerms] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [quickSavingCollectionId, setQuickSavingCollectionId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quickTerm, setQuickTerm] = useState("");
  const [quickImageUrl, setQuickImageUrl] = useState("");
  const [quickPixabayImages, setQuickPixabayImages] = useState<PixabayImage[]>([]);
  const [wordFilter, setWordFilter] = useState<"all" | "translation" | "images" | "audio">("all");
  const [isFillingImages, setIsFillingImages] = useState<string | null>(null);
  const [missingMedia, setMissingMedia] = useState<Record<string, MissingMediaPreview[]>>({});

  const headers = () => ({
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  });
  const loadCollections = async () => {
    if (!session) return;
    const body = await readBody<{ collections: Collection[] }>(
      await fetch(`${apiUrl}/admin/collections`, { headers: headers() }),
    );
    setCollections(body.collections);
  };
  useEffect(() => {
    void loadCollections().catch((error: unknown) =>
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las colecciones.",
      ),
    );
  }, [session]);

  if (isLoading || isSyncingUser)
    return <main className="auth-page">Comprobando permisos...</main>;
  if (apiUser?.role !== "ADMIN") return <Navigate to="/" replace />;

  const toggleCollection = async (collection: Collection) => {
    const open = !expanded[collection.id];
    setExpanded((current) => ({ ...current, [collection.id]: open }));
    if (!open || wordsByCollection[collection.id] || !session) return;
    const body = await readBody<{ words: Array<{ word: EditableWord }> }>(
      await fetch(`${apiUrl}/admin/collections/${collection.id}/words`, {
        headers: headers(),
      }),
    );
    setWordsByCollection((current) => ({
      ...current,
      [collection.id]: body.words.map((item) => item.word),
    }));
  };

  const createCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    try {
      await readBody(
        await fetch(`${apiUrl}/admin/collections`, {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: collectionName,
            slug: collectionSlug,
            imageUrl: collectionImageUrl.trim() || collectionPixabayImages[0]?.url || null,
            isPublished: false,
          }),
        }),
      );
      setCollectionName("");
      setCollectionSlug("");
      setCollectionImageUrl("");
      setCollectionPixabayImages([]);
      setModal(null);
      setMessage("Colección creada.");
      await loadCollections();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la colección.",
      );
    }
  };
  const openCollectionEditor = (collection: Collection) => {
    setCollectionName(collection.name);
    setCollectionImageUrl(collection.imageUrl ?? "");
    setCollectionPixabayImages([]);
    setEditor({ mode: "edit", collectionId: collection.id });
    setModal("edit-collection");
  };
  const updateCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !editor?.collectionId) return;
    try {
      await readBody(
        await fetch(`${apiUrl}/admin/collections/${editor.collectionId}`, {
          method: "PATCH",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: collectionName,
            imageUrl: collectionImageUrl.trim() || collectionPixabayImages[0]?.url || null,
          }),
        }),
      );
      setCollectionName("");
      setCollectionImageUrl("");
      setCollectionPixabayImages([]);
      setEditor(null);
      setModal(null);
      setMessage("Colección actualizada.");
      await loadCollections();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la colección.",
      );
    }
  };
  const toggleCollectionPublication = async (collection: Collection) => {
    if (!session) return;
    try {
      await readBody(
        await fetch(
          `${apiUrl}/admin/collections/${collection.id}/publication`,
          {
            method: "PATCH",
            headers: { ...headers(), "Content-Type": "application/json" },
            body: JSON.stringify({ isPublished: !collection.isPublished }),
          },
        ),
      );
      setCollections((current) =>
        current.map((item) =>
          item.id === collection.id
            ? { ...item, isPublished: !item.isPublished }
            : item,
        ),
      );
      setMessage(
        `Colección ${!collection.isPublished ? "publicada" : "devuelta a borrador"}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de la colección.",
      );
    }
  };
  const createBulkWords = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !bulkCollectionId) return;
    const parsedLines = parseBulkLines(bulkTerms);
    const validLines = parsedLines.filter((line) => line.status === "valid");
    if (!validLines.length) {
      setMessage("Escribe al menos una palabra, una por línea.");
      return;
    }
    if (validLines.length > 50) {
      setMessage("Puedes añadir un máximo de 50 palabras por lista.");
      return;
    }
    if (bulkCollectionId === "new" && (!bulkCollectionName.trim() || !bulkCollectionSlug.trim())) {
      setMessage("Indica el nombre y slug de la nueva colección.");
      return;
    }
    setIsBulkSaving(true);
    try {
      const result = await readBody<{
        words: EditableWord[];
        skipped: number;
        received: number;
        failedAudio: number;
        collectionId: string;
      }>(
        await fetch(
          `${apiUrl}/admin/collections/${bulkCollectionId}/words/bulk`,
          {
            method: "POST",
            headers: { ...headers(), "Content-Type": "application/json" },
            body: JSON.stringify({ words: validLines.map(({ term, translationEs }) => ({ term, translationEs })), collectionName: bulkCollectionName, collectionSlug: bulkCollectionSlug }),
          },
        ),
      );
      const targetCollectionId = result.collectionId ?? bulkCollectionId;
      setWordsByCollection((current) => ({
        ...current,
        [targetCollectionId]: [
          ...(current[targetCollectionId] ?? []),
          ...result.words,
        ],
      }));
      setExpanded((current) => ({ ...current, [targetCollectionId]: true }));
      setBulkTerms("");
      setBulkCollectionName("");
      setBulkCollectionSlug("");
      setModal(null);
      setMessage(
        `${result.words.length} palabras añadidas${result.skipped ? `; ${result.skipped} ya estaban en la colección` : ""}${result.failedAudio ? `; ${result.failedAudio} audios no disponibles` : ""}.`,
      );
      await loadCollections();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la lista de palabras.",
      );
    } finally {
      setIsBulkSaving(false);
    }
  };
  const createQuickWord = async (
    event: React.FormEvent<HTMLFormElement>,
    collectionId: string,
  ) => {
    event.preventDefault();
    if (!session) return;
    const formData = new FormData(event.currentTarget);
    const term = String(formData.get("term") ?? "").trim();
    const translationEs = String(formData.get("translationEs") ?? "").trim();
    const level = String(formData.get("level") ?? "A1");
    if (!term || !translationEs) return;
    setQuickSavingCollectionId(collectionId);
    try {
      const result = await readBody<{ word: { word: EditableWord } }>(
        await fetch(`${apiUrl}/admin/collections/${collectionId}/words`, {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({
            term,
            translationEs,
            level,
            isPublished: false,
            images: quickPixabayImages.map((image) => ({
              url: image.url,
              attribution: `Pixabay: ${image.user}`,
              metadata: {
                id: image.id,
                pageUrl: image.pageUrl,
                tags: image.tags,
              },
            })),
          }),
        }),
      );
      setWordsByCollection((current) => ({
        ...current,
        [collectionId]: [...(current[collectionId] ?? []), result.word.word],
      }));
      event.currentTarget.reset();
      setQuickTerm("");
      setQuickImageUrl("");
      setQuickPixabayImages([]);
      setMessage(`“${term}” añadida a la colección.`);
      await loadCollections();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear la palabra.",
      );
    } finally {
      setQuickSavingCollectionId(null);
    }
  };
  const handleWordSaved = (word: EditableWord, collectionId: string) => {
    setWordsByCollection((current) => ({
      ...current,
      [collectionId]: current[collectionId]?.some((item) => item.id === word.id)
        ? current[collectionId].map((item) =>
            item.id === word.id ? word : item,
          )
        : [...(current[collectionId] ?? []), word],
    }));
    setEditor(null);
    setMessage("Palabra guardada.");
  };
  const fillMissingImages = async (collectionId: string) => {
    if (!session) return;
    setIsFillingImages(collectionId);
    try {
      const result = await readBody<{ previews: MissingMediaPreview[] }>(await fetch(`${apiUrl}/admin/collections/${collectionId}/images/fill-missing`, { method: "POST", headers: headers() }));
      setMissingMedia((current) => ({ ...current, [collectionId]: result.previews }));
      setMessage(`${result.previews.length} palabras están listas para revisar.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudieron completar las imágenes."); }
    finally { setIsFillingImages(null); }
  };
  const confirmMissingMedia = async (collectionId: string) => {
    if (!session) return;
    const previews = missingMedia[collectionId] ?? [];
    try {
      await readBody(await fetch(`${apiUrl}/admin/collections/${collectionId}/images/fill-missing/confirm`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ items: previews }) }));
      setMissingMedia((current) => ({ ...current, [collectionId]: [] }));
      setWordsByCollection((current) => { const next = { ...current }; delete next[collectionId]; return next; });
      setMessage("Imágenes y pronunciaciones guardadas.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo confirmar el contenido."); }
  };
  const bulkLinePreview = parseBulkLines(bulkTerms);
  const validBulkLines = bulkLinePreview.filter((line) => line.status === "valid");

  return (
    <AdminLayout>
      <header className="admin-header">
        <div>
          <p className="eyebrow">LEXFLOW / ADMIN</p>
          <h1>Centro de contenido</h1>
          <p>Gestiona la biblioteca desde un solo lugar.</p>
        </div>
        <span className="role-badge">ADMIN</span>
      </header>
      {message ? <p className="admin-message">{message}</p> : null}
      <section className="action-grid">
        <button
          className="action-card action-card-active"
          onClick={() =>
            document
              .getElementById("library")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="action-icon">⌘</span>
          <strong>Biblioteca</strong>
          <small>Explora colecciones y palabras.</small>
        </button>
        <button
          className="action-card"
          onClick={() => setEditor({ mode: "new" })}
        >
          <span className="action-icon">＋</span>
          <strong>Nueva palabra</strong>
          <small>Crear y enlazar una palabra.</small>
        </button>
        <button
          className="action-card"
          onClick={() => {
            setBulkCollectionId(collections[0]?.id ?? "");
            setModal("bulk-words");
          }}
        >
          <span className="action-icon">☷</span>
          <strong>Lista rápida</strong>
          <small>Añade muchas palabras en inglés.</small>
        </button>
        <button className="action-card" onClick={() => setModal("collection")}>
          <span className="action-icon">▦</span>
          <strong>Nueva colección</strong>
          <small>Preparar una nueva unidad.</small>
        </button>
      </section>
      <section id="library" className="admin-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">BIBLIOTECA</p>
            <h2>Colecciones</h2>
          </div>
          <span>{collections.length} total</span>
        </div>
        <div className="admin-filter-bar"><strong>Filtrar palabras</strong><button className={wordFilter === "all" ? "filter-button active" : "filter-button"} onClick={() => setWordFilter("all")}>Todas</button><button className={wordFilter === "translation" ? "filter-button active" : "filter-button"} onClick={() => setWordFilter("translation")}>Sin significado</button><button className={wordFilter === "images" ? "filter-button active" : "filter-button"} onClick={() => setWordFilter("images")}>Sin imágenes</button><button className={wordFilter === "audio" ? "filter-button active" : "filter-button"} onClick={() => setWordFilter("audio")}>Sin sonido</button></div>
        <div className="collection-stack">
          {collections.map((collection) => (
            <div className="collection-item" key={collection.id}>
              <div className="collection-row">
                <button
                  className="collection-toggle"
                  onClick={() => void toggleCollection(collection)}
                >
                  <span className="chevron">
                    {expanded[collection.id] ? "⌄" : "›"}
                  </span>
                  {collection.imageUrl ? (
                    <img
                      className="collection-admin-thumb"
                      src={collection.imageUrl}
                      alt=""
                    />
                  ) : null}
                  <span className="collection-title">
                    <strong>{collection.name}</strong>
                    <small>
                      {collection.slug} · {collection._count.words} palabras
                    </small>
                  </span>
                </button>
                <button
                  className="edit-collection-button"
                  type="button"
                  onClick={() => openCollectionEditor(collection)}
                >
                  Editar
                </button>
                <button
                  className={`publish-switch ${collection.isPublished ? "publish-switch-on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={collection.isPublished}
                  aria-label={`${collection.isPublished ? "Despublicar" : "Publicar"} ${collection.name}`}
                  onClick={() => void toggleCollectionPublication(collection)}
                >
                  <span />
                  <em>{collection.isPublished ? "Publicada" : "Borrador"}</em>
                </button>
              </div>
              {expanded[collection.id] ? (
                <div className="nested-words">
                  <div className="collection-maintenance"><button className="secondary-button" type="button" onClick={() => void fillMissingImages(collection.id)} disabled={isFillingImages === collection.id}>{isFillingImages === collection.id ? "Preparando vista previa..." : "Previsualizar faltantes"}</button>{missingMedia[collection.id]?.length ? <button className="primary-button" type="button" onClick={() => void confirmMissingMedia(collection.id)}>Confirmar y guardar</button> : null}</div>
                  {missingMedia[collection.id]?.length ? <div className="missing-media-preview"><strong>Vista previa, todavía no guardada</strong>{missingMedia[collection.id].map((item) => <div className="missing-media-card" key={item.wordId}><div><b>{item.term}</b><small>{item.images.length ? `${item.images.length} imágenes propuestas` : "Sin imágenes encontradas"}</small></div><div className="missing-media-images">{item.images.map((image) => <img key={image.url} src={image.url} alt={`Propuesta para ${item.term}`} />)}</div>{item.audio ? <audio controls src={item.audio.url} aria-label={`Pronunciación de ${item.term}`} /> : <small>Pronunciación no disponible</small>}</div>)}</div> : null}
                  {(wordsByCollection[collection.id] ?? []).filter((word) => wordFilter === "all" || (wordFilter === "translation" && !word.translationEs.trim()) || (wordFilter === "images" && !word.images?.length) || (wordFilter === "audio" && !word.audios?.length)).map((word) => (
                    <div className="word-item" key={word.id}>
                      <button
                        className="word-row"
                        onClick={() =>
                          setEditor({
                            mode: "edit",
                            word,
                            collectionId: collection.id,
                          })
                        }
                      >
                        <span>
                          <strong>{word.term}</strong>
                          <small>
                            {word.translationEs} · {word.level}
                          </small>
                          {word.images?.length ? (
                            <span className="word-row-media" aria-label={`${word.images.length} imágenes asociadas`}>
                              {word.images.map((image) => (
                                <img key={image.id} src={image.url} alt="" />
                              ))}
                            </span>
                          ) : null}
                          <small className="word-completeness">{word.audios?.length ? "🔊" : "⚠ Sin sonido"}</small>
                        </span>
                        <span>
                          Editar · {word.isPublished ? "Publicado" : "Borrador"}
                        </span>
                      </button>
                      {editor?.mode === "edit" &&
                      editor.word?.id === word.id ? (
                        <WordEditor
                          word={word}
                          collections={collections}
                          initialCollectionId={collection.id}
                          onSaved={handleWordSaved}
                          onCancel={() => setEditor(null)}
                        />
                      ) : null}
                    </div>
                  ))}
                  {(wordsByCollection[collection.id] ?? []).length === 0 ? (
                    <p className="empty-state">
                      Esta colección todavía no tiene palabras.
                    </p>
                  ) : null}
                  <form
                    className="quick-word-form"
                    onSubmit={(event) =>
                      void createQuickWord(event, collection.id)
                    }
                  >
                    <strong>Añadir palabra</strong>
                    <input name="term" required placeholder="Palabra en inglés" value={quickTerm} onChange={(event) => setQuickTerm(event.target.value)} />
                    <input
                      name="translationEs"
                      required
                      placeholder="Traducción al español"
                    />
                    <select name="level" defaultValue="A1" aria-label="Nivel">
                      <option>A1</option>
                      <option>A2</option>
                      <option>B1</option>
                      <option>B2</option>
                      <option>C1</option>
                      <option>C2</option>
                    </select>
                    <input type="url" placeholder="URL de imagen" value={quickImageUrl} onChange={(event) => setQuickImageUrl(event.target.value)} />
                    <PixabayPicker imageUrl={quickImageUrl} onImageUrlChange={setQuickImageUrl} selectedImages={quickPixabayImages} onSelectedImagesChange={setQuickPixabayImages} />
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={quickSavingCollectionId === collection.id}
                    >
                      {quickSavingCollectionId === collection.id
                        ? "Guardando..."
                        : "Añadir"}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      {modal === "collection" ? (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form
              className="admin-form"
              onSubmit={(event) => void createCollection(event)}
            >
              <div className="editor-heading">
                <div>
                  <p className="eyebrow">ESTRUCTURA</p>
                  <h2>Nueva colección</h2>
                </div>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  ×
                </button>
              </div>
              <label>
                Nombre
                <input
                  required
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value)}
                  placeholder="Colors"
                />
              </label>
              <label>
                Slug
                <input
                  required
                  value={collectionSlug}
                  onChange={(event) => setCollectionSlug(event.target.value)}
                  placeholder="colors"
                />
              </label>
              <label>
                Imagen de portada
                <input
                  type="text"
                  inputMode="url"
                  value={collectionImageUrl}
                  onChange={(event) =>
                    setCollectionImageUrl(event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>
              {collectionImageUrl ? (
                <img
                  className="collection-modal-preview"
                  src={collectionImageUrl}
                  alt="Vista previa de la colección"
                />
              ) : null}
              <PixabayPicker imageUrl={collectionImageUrl} onImageUrlChange={setCollectionImageUrl} selectedImages={collectionPixabayImages} onSelectedImagesChange={setCollectionPixabayImages} />
              <button className="primary-button" type="submit">
                Crear colección
              </button>
            </form>
          </div>
        </div>
      ) : null}
      {modal === "edit-collection" ? (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form
              className="admin-form"
              onSubmit={(event) => void updateCollection(event)}
            >
              <div className="editor-heading">
                <div>
                  <p className="eyebrow">COLECCIÓN</p>
                  <h2>Editar colección</h2>
                </div>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  ×
                </button>
              </div>
              <label>
                Nombre
                <input
                  required
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value)}
                />
              </label>
              <label>
                Imagen de portada
                <input
                  type="text"
                  inputMode="url"
                  value={collectionImageUrl}
                  onChange={(event) =>
                    setCollectionImageUrl(event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>
              {collectionImageUrl ? (
                <img
                  className="collection-modal-preview"
                  src={collectionImageUrl}
                  alt="Vista previa de la colección"
                />
              ) : null}
              <PixabayPicker imageUrl={collectionImageUrl} onImageUrlChange={setCollectionImageUrl} selectedImages={collectionPixabayImages} onSelectedImagesChange={setCollectionPixabayImages} />
              <button className="primary-button" type="submit">
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      ) : null}
      {modal === "bulk-words" ? (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form
              className="admin-form bulk-words-form"
              onSubmit={(event) => void createBulkWords(event)}
            >
              <div className="editor-heading">
                <div>
                  <p className="eyebrow">CARGA RÁPIDA</p>
                  <h2>Lista de palabras</h2>
                </div>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  ×
                </button>
              </div>
              <p className="form-help">
                Escribe una palabra en inglés por línea. Se crearán como
                borradores A1 para completar después.
              </p>
              <label>
                Colección
                <select
                  required
                  value={bulkCollectionId}
                  onChange={(event) => setBulkCollectionId(event.target.value)}
                >
                  <option value="">Selecciona una colección</option>
                  <option value="new">＋ Crear nueva colección</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
              {bulkCollectionId === "new" ? <>
                <label>Nombre de la colección<input required value={bulkCollectionName} onChange={(event) => setBulkCollectionName(event.target.value)} placeholder="Animals" /></label>
                <label>Slug de la colección<input required value={bulkCollectionSlug} onChange={(event) => setBulkCollectionSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} placeholder="animals" /></label>
              </> : null}
              <label>Palabras y traducciones</label>
              <div className="bulk-code-editor">
                <div className="bulk-code-toolbar"><span>lista.lexflow</span><small>formato: palabra en inglés, traducción</small></div>
                <textarea required rows={10} value={bulkTerms} onChange={(event) => setBulkTerms(event.target.value)} placeholder={"cat, gato\ndog, perro\nelephant, elefante"} spellCheck={false} />
                <div className="bulk-line-preview" aria-live="polite">
                  {bulkLinePreview.map((line) => <div className={`bulk-line bulk-line-${line.status}`} key={line.line}><span className="bulk-line-number">{line.line}</span><span className="bulk-line-symbol" aria-label={line.message}>{line.status === "valid" ? "✓" : line.status === "warning" ? "⚠" : line.status === "invalid" ? "✕" : "·"}</span><span>{line.raw || "Línea vacía"}</span><small>{line.message}</small></div>)}
                </div>
              </div>
              <div className="bulk-count">{validBulkLines.length} palabras válidas · {bulkLinePreview.filter((line) => line.status === "invalid").length} inválidas</div>
              <div className="editor-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isBulkSaving}
                >
                  {isBulkSaving ? "Añadiendo..." : "Añadir lista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {editor?.mode === "new" ? (
        <div className="modal-backdrop" onMouseDown={() => setEditor(null)}>
          <div
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <WordEditor
              collections={collections}
              onSaved={handleWordSaved}
              onCancel={() => setEditor(null)}
            />
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
