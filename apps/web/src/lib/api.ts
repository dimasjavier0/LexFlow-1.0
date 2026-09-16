import type { Session } from "@supabase/supabase-js";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error("Missing VITE_API_URL");
}

export type ApiUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};

export type ApiCollectionSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { words: number };
};

export type ApiWord = {
  id: string;
  term: string;
  translationEs: string;
  level: string;
  images: Array<{ id: string; url: string; attribution: string | null }>;
  audios: Array<{ id: string; url: string }>;
  videos: Array<{ id: string; url: string }>;
};

export type ApiCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  words: Array<{ position: number; word: ApiWord }>;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) throw new Error("No se pudieron cargar los datos.");
  return (await response.json()) as T;
}

export async function getCollections(): Promise<ApiCollectionSummary[]> {
  const body = await getJson<{ collections: ApiCollectionSummary[] }>("/collections");
  return body.collections;
}

export async function getCollection(slug: string): Promise<ApiCollection> {
  const body = await getJson<{ collection: ApiCollection }>(`/collections/${encodeURIComponent(slug)}`);
  return body.collection;
}

export async function getCurrentUser(session: Session): Promise<ApiUser> {
  const response = await fetch(`${apiUrl}/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    throw new Error("No se pudo sincronizar el usuario con la API.");
  }

  const body = (await response.json()) as { user: ApiUser };
  return body.user;
}

export type LearningStatus = "WANT_TO_LEARN" | "NOT_INTERESTED" | "LEARNED";

export async function updateProgress(session: Session, wordId: string, status: LearningStatus): Promise<void> {
  const response = await fetch(`${apiUrl}/progress/${encodeURIComponent(wordId)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) throw new Error("No se pudo guardar tu progreso.");
}

export async function getProgress(session: Session): Promise<Record<string, LearningStatus>> {
  const response = await fetch(`${apiUrl}/progress`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("No se pudo cargar tu progreso.");
  const body = (await response.json()) as { progress: Array<{ wordId: string; status: LearningStatus }> };
  return Object.fromEntries(body.progress.map((item) => [item.wordId, item.status]));
}