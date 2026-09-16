import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

const apiUrl = import.meta.env.VITE_API_URL;

export function AdminPage() {
  const { apiUser, isLoading, isSyncingUser, session } = useAuth();
  const [collections, setCollections] = useState<Array<{ id: string; name: string; slug: string; isPublished: boolean }>>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session || apiUser?.role !== "ADMIN") return;
    void fetch(`${apiUrl}/admin/collections`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.json() as Promise<{ collections: typeof collections }>)
      .then((body) => setCollections(body.collections));
  }, [apiUser?.role, session]);

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

  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
    <p className="eyebrow">ADMIN</p>
    <h1 className="mt-2 text-4xl font-bold text-slate-950">Colecciones</h1>
    <form className="admin-form" onSubmit={(event) => void createCollection(event)}>
      <input required placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <input required placeholder="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
      <button className="primary-button" type="submit">Crear colección</button>
    </form>
    {message ? <p className="mt-4 text-slate-600">{message}</p> : null}
    <ul className="admin-list">{collections.map((collection) => <li key={collection.id}><strong>{collection.name}</strong><span>{collection.slug} · {collection.isPublished ? "Publicada" : "Borrador"}</span></li>)}</ul>
  </main>;
}