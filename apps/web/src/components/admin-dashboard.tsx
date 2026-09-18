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
  const [modal, setModal] = useState<"collection" | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
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
  const handleWordSaved = (word: EditableWord, collectionId: string) => { setWordsByCollection((current) => ({ ...current, [collectionId]: current[collectionId]?.some((item) => item.id === word.id) ? current[collectionId].map((item) => item.id === word.id ? word : item) : [...(current[collectionId] ?? []), word] })); setEditor(null); setMessage("Palabra guardada."); };

  return <main className="admin-shell">
    <header className="admin-header"><div><p className="eyebrow">LEXFLOW / ADMIN</p><h1>Centro de contenido</h1><p>Gestiona la biblioteca desde un solo lugar.</p></div><span className="role-badge">ADMIN</span></header>
    {message ? <p className="admin-message">{message}</p> : null}
    <section className="action-grid"><button className="action-card action-card-active" onClick={() => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })}><span className="action-icon">⌘</span><strong>Biblioteca</strong><small>Explora colecciones y palabras.</small></button><button className="action-card" onClick={() => setEditor({ mode: "new" })}><span className="action-icon">＋</span><strong>Nueva palabra</strong><small>Crear y enlazar una palabra.</small></button><button className="action-card" onClick={() => setModal("collection")}><span className="action-icon">▦</span><strong>Nueva colección</strong><small>Preparar una nueva unidad.</small></button></section>
    <section id="library" className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">BIBLIOTECA</p><h2>Colecciones</h2></div><span>{collections.length} total</span></div><div className="collection-stack">{collections.map((collection) => <div className="collection-item" key={collection.id}><button className="collection-toggle" onClick={() => void toggleCollection(collection)}><span className="chevron">{expanded[collection.id] ? "⌄" : "›"}</span><span><strong>{collection.name}</strong><small>{collection.slug} · {collection._count.words} palabras</small></span><em>{collection.isPublished ? "Publicada" : "Borrador"}</em></button>{expanded[collection.id] ? <div className="nested-words">{(wordsByCollection[collection.id] ?? []).map((word) => <div className="word-item" key={word.id}><button className="word-row" onClick={() => setEditor({ mode: "edit", word, collectionId: collection.id })}><span><strong>{word.term}</strong><small>{word.translationEs} · {word.level}</small></span><span>Editar · {word.isPublished ? "Publicado" : "Borrador"}</span></button>{editor?.mode === "edit" && editor.word?.id === word.id ? <WordEditor word={word} collections={collections} initialCollectionId={collection.id} onSaved={handleWordSaved} onCancel={() => setEditor(null)} /> : null}</div>)}{(wordsByCollection[collection.id] ?? []).length === 0 ? <p className="empty-state">Esta colección todavía no tiene palabras.</p> : null}</div> : null}</div>)}</div></section>
    {modal === "collection" ? <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><form className="admin-form" onSubmit={(event) => void createCollection(event)}><div className="editor-heading"><div><p className="eyebrow">ESTRUCTURA</p><h2>Nueva colección</h2></div><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button></div><label>Nombre<input required value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="Colors" /></label><label>Slug<input required value={collectionSlug} onChange={(event) => setCollectionSlug(event.target.value)} placeholder="colors" /></label><button className="primary-button" type="submit">Crear colección</button></form></div></div> : null}
    {editor?.mode === "new" ? <div className="modal-backdrop" onMouseDown={() => setEditor(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><WordEditor collections={collections} onSaved={handleWordSaved} onCancel={() => setEditor(null)} /></div></div> : null}
  </main>;
}
