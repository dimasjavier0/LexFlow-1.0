import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { EditableWord, WordEditor } from "./word-editor";

const apiUrl = import.meta.env.VITE_API_URL;
type Collection = { id: string; name: string; slug: string; description: string | null; isPublished: boolean; _count: { words: number } };

async function readBody<T>(response: Response): Promise<T> { if (!response.ok) throw new Error("No se pudo completar la operación."); return (await response.json()) as T; }

export function AdminDashboard() {
  const { apiUser, isLoading, isSyncingUser, session } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [wordsByCollection, setWordsByCollection] = useState<Record<string, EditableWord[]>>({});
  const [editor, setEditor] = useState<{ mode: "new" | "edit"; word?: EditableWord; collectionId?: string } | null>(null);
  const [modal, setModal] = useState<"collection" | "bulk-words" | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [bulkCollectionId, setBulkCollectionId] = useState("");
  const [bulkTerms, setBulkTerms] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [quickSavingCollectionId, setQuickSavingCollectionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const headers = () => ({ Authorization: `Bearer ${session?.access_token ?? ""}` });
  const loadCollections = async () => { if (!session) return; const body = await readBody<{ collections: Collection[] }>(await fetch(`${apiUrl}/admin/collections`, { headers: headers() })); setCollections(body.collections); };
  useEffect(() => { void loadCollections().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No se pudieron cargar las colecciones.")); }, [session]);

  if (isLoading || isSyncingUser) return <main className="auth-page">Comprobando permisos...</main>;
  if (apiUser?.role !== "ADMIN") return <Navigate to="/" replace />;

  const toggleCollection = async (collection: Collection) => {
    const open = !expanded[collection.id]; setExpanded((current) => ({ ...current, [collection.id]: open }));
    if (!open || wordsByCollection[collection.id] || !session) return;
    const body = await readBody<{ words: Array<{ word: EditableWord }> }>(await fetch(`${apiUrl}/admin/collections/${collection.id}/words`, { headers: headers() }));
    setWordsByCollection((current) => ({ ...current, [collection.id]: body.words.map((item) => item.word) }));
  };

  const createCollection = async (event: React.FormEvent) => { event.preventDefault(); if (!session) return; try { await readBody(await fetch(`${apiUrl}/admin/collections`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ name: collectionName, slug: collectionSlug, isPublished: false }) })); setCollectionName(""); setCollectionSlug(""); setModal(null); setMessage("Colección creada."); await loadCollections(); } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear la colección."); } };
  const createBulkWords = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !bulkCollectionId) return;
    const terms = [...new Set(bulkTerms.split(/\r?\n/).map((term) => term.trim()).filter(Boolean))];
    if (!terms.length) { setMessage("Escribe al menos una palabra, una por línea."); return; }
    if (terms.length > 200) { setMessage("Puedes añadir un máximo de 200 palabras por lista."); return; }
    setIsBulkSaving(true);
    try {
      const result = await readBody<{ words: EditableWord[]; skipped: number; received: number }>(await fetch(`${apiUrl}/admin/collections/${bulkCollectionId}/words/bulk`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ terms }) }));
      setWordsByCollection((current) => ({ ...current, [bulkCollectionId]: [...(current[bulkCollectionId] ?? []), ...result.words] }));
      setExpanded((current) => ({ ...current, [bulkCollectionId]: true }));
      setBulkTerms("");
      setModal(null);
      setMessage(`${result.words.length} palabras añadidas${result.skipped ? `; ${result.skipped} ya estaban en la colección` : ""}.`);
      await loadCollections();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear la lista de palabras."); }
    finally { setIsBulkSaving(false); }
  };
  const createQuickWord = async (event: React.FormEvent<HTMLFormElement>, collectionId: string) => {
    event.preventDefault();
    if (!session) return;
    const formData = new FormData(event.currentTarget);
    const term = String(formData.get("term") ?? "").trim();
    const translationEs = String(formData.get("translationEs") ?? "").trim();
    const level = String(formData.get("level") ?? "A1");
    if (!term || !translationEs) return;
    setQuickSavingCollectionId(collectionId);
    try {
      const result = await readBody<{ word: { word: EditableWord } }>(await fetch(`${apiUrl}/admin/collections/${collectionId}/words`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ term, translationEs, level, isPublished: false }) }));
      setWordsByCollection((current) => ({ ...current, [collectionId]: [...(current[collectionId] ?? []), result.word.word] }));
      event.currentTarget.reset();
      setMessage(`“${term}” añadida a la colección.`);
      await loadCollections();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear la palabra."); }
    finally { setQuickSavingCollectionId(null); }
  };
  const handleWordSaved = (word: EditableWord, collectionId: string) => { setWordsByCollection((current) => ({ ...current, [collectionId]: current[collectionId]?.some((item) => item.id === word.id) ? current[collectionId].map((item) => item.id === word.id ? word : item) : [...(current[collectionId] ?? []), word] })); setEditor(null); setMessage("Palabra guardada."); };

  return <main className="admin-shell">
    <header className="admin-header"><div><p className="eyebrow">LEXFLOW / ADMIN</p><h1>Centro de contenido</h1><p>Gestiona la biblioteca desde un solo lugar.</p></div><span className="role-badge">ADMIN</span></header>
    {message ? <p className="admin-message">{message}</p> : null}
    <section className="action-grid"><button className="action-card action-card-active" onClick={() => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })}><span className="action-icon">⌘</span><strong>Biblioteca</strong><small>Explora colecciones y palabras.</small></button><button className="action-card" onClick={() => setEditor({ mode: "new" })}><span className="action-icon">＋</span><strong>Nueva palabra</strong><small>Crear y enlazar una palabra.</small></button><button className="action-card" onClick={() => { setBulkCollectionId(collections[0]?.id ?? ""); setModal("bulk-words"); }}><span className="action-icon">☷</span><strong>Lista rápida</strong><small>Añade muchas palabras en inglés.</small></button><button className="action-card" onClick={() => setModal("collection")}><span className="action-icon">▦</span><strong>Nueva colección</strong><small>Preparar una nueva unidad.</small></button></section>
    <section id="library" className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">BIBLIOTECA</p><h2>Colecciones</h2></div><span>{collections.length} total</span></div><div className="collection-stack">{collections.map((collection) => <div className="collection-item" key={collection.id}><button className="collection-toggle" onClick={() => void toggleCollection(collection)}><span className="chevron">{expanded[collection.id] ? "⌄" : "›"}</span><span><strong>{collection.name}</strong><small>{collection.slug} · {collection._count.words} palabras</small></span><em>{collection.isPublished ? "Publicada" : "Borrador"}</em></button>{expanded[collection.id] ? <div className="nested-words">{(wordsByCollection[collection.id] ?? []).map((word) => <div className="word-item" key={word.id}><button className="word-row" onClick={() => setEditor({ mode: "edit", word, collectionId: collection.id })}><span><strong>{word.term}</strong><small>{word.translationEs} · {word.level}</small></span><span>Editar · {word.isPublished ? "Publicado" : "Borrador"}</span></button>{editor?.mode === "edit" && editor.word?.id === word.id ? <WordEditor word={word} collections={collections} initialCollectionId={collection.id} onSaved={handleWordSaved} onCancel={() => setEditor(null)} /> : null}</div>)}{(wordsByCollection[collection.id] ?? []).length === 0 ? <p className="empty-state">Esta colección todavía no tiene palabras.</p> : null}<form className="quick-word-form" onSubmit={(event) => void createQuickWord(event, collection.id)}><strong>Añadir palabra</strong><input name="term" required placeholder="Palabra en inglés" /><input name="translationEs" required placeholder="Traducción al español" /><select name="level" defaultValue="A1" aria-label="Nivel"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select><button className="primary-button" type="submit" disabled={quickSavingCollectionId === collection.id}>{quickSavingCollectionId === collection.id ? "Guardando..." : "Añadir"}</button></form></div> : null}</div>)}</div></section>
    {modal === "collection" ? <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><form className="admin-form" onSubmit={(event) => void createCollection(event)}><div className="editor-heading"><div><p className="eyebrow">ESTRUCTURA</p><h2>Nueva colección</h2></div><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button></div><label>Nombre<input required value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="Colors" /></label><label>Slug<input required value={collectionSlug} onChange={(event) => setCollectionSlug(event.target.value)} placeholder="colors" /></label><button className="primary-button" type="submit">Crear colección</button></form></div></div> : null}
    {modal === "bulk-words" ? <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><form className="admin-form bulk-words-form" onSubmit={(event) => void createBulkWords(event)}><div className="editor-heading"><div><p className="eyebrow">CARGA RÁPIDA</p><h2>Lista de palabras</h2></div><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button></div><p className="form-help">Escribe una palabra en inglés por línea. Se crearán como borradores A1 para completar después.</p><label>Colección<select required value={bulkCollectionId} onChange={(event) => setBulkCollectionId(event.target.value)}><option value="">Selecciona una colección</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><label>Palabras en inglés<textarea required rows={12} value={bulkTerms} onChange={(event) => setBulkTerms(event.target.value)} placeholder={"cat\ndog\nelephant\nfox"} /></label><div className="bulk-count">{bulkTerms.split(/\r?\n/).map((term) => term.trim()).filter(Boolean).length} palabras listas</div><div className="editor-actions"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancelar</button><button className="primary-button" type="submit" disabled={isBulkSaving}>{isBulkSaving ? "Añadiendo..." : "Añadir lista"}</button></div></form></div></div> : null}
    {editor?.mode === "new" ? <div className="modal-backdrop" onMouseDown={() => setEditor(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><WordEditor collections={collections} onSaved={handleWordSaved} onCancel={() => setEditor(null)} /></div></div> : null}
  </main>;
}
