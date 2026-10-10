import type { Session } from "@supabase/supabase-js";
import { apiRequest } from "./api";

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  _count: { words: number };
};

export type AdminAudio = { id: string; url: string; voice?: string | null; accent?: string | null; provider?: string | null };

export type AdminWord = {
  id: string;
  term: string;
  translationEs: string;
  level: string;
  isPublished: boolean;
  images: Array<{ id: string; url: string }>;
  audios: AdminAudio[];
  videos: Array<{ id: string; url: string }>;
};

export type NewWordImage = { url: string; attribution?: string; metadata?: Record<string, unknown> };

export type MissingMediaPreview = {
  wordId: string;
  term: string;
  images: Array<{ url: string; attribution: string; metadata: Record<string, unknown> }>;
  audio: { url: string; provider: string; voice: string; accent: string; metadata: Record<string, unknown> } | null;
};

export type BulkWordsResult = { words: AdminWord[]; skipped: number; received: number; failedAudio: number; collectionId: string };

const INVALID_DATA = "Revisa los datos del formulario.";

export async function listCollections(session: Session): Promise<AdminCollection[]> {
  const body = await apiRequest<{ collections: AdminCollection[] }>("/admin/collections", { session, errorMessage: "No se pudieron cargar las colecciones." });
  return body.collections;
}

export async function createCollection(session: Session, input: { name: string; slug: string; description: string | null; imageUrl: string | null }): Promise<void> {
  await apiRequest("/admin/collections", {
    method: "POST",
    session,
    body: { ...input, isPublished: false },
    errorMessage: "No se pudo crear la colección.",
    statusMessages: { 400: "Revisa el nombre, el slug (minúsculas, números y guiones) y la URL de la imagen.", 409: "Ya existe una colección con ese slug." },
  });
}

export async function updateCollection(session: Session, collectionId: string, input: { name: string; description: string | null; imageUrl: string | null }): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}`, {
    method: "PATCH",
    session,
    body: input,
    errorMessage: "No se pudo actualizar la colección.",
    statusMessages: { 400: "Revisa el nombre y la URL de la imagen." },
  });
}

export async function setCollectionPublication(session: Session, collectionId: string, isPublished: boolean): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}/publication`, { method: "PATCH", session, body: { isPublished }, errorMessage: "No se pudo cambiar el estado de la colección." });
}

export async function listWords(session: Session, collectionId: string): Promise<AdminWord[]> {
  const body = await apiRequest<{ words: Array<{ word: AdminWord }> }>(`/admin/collections/${collectionId}/words`, { session, errorMessage: "No se pudieron cargar las palabras." });
  return body.words.map((item) => item.word);
}

export async function createWord(
  session: Session,
  collectionId: string,
  input: { term: string; translationEs: string; level: string; images?: NewWordImage[] },
): Promise<AdminWord> {
  const body = await apiRequest<{ word: { word: AdminWord } }>(`/admin/collections/${collectionId}/words`, {
    method: "POST",
    session,
    body: { ...input, isPublished: false },
    errorMessage: "No se pudo crear la palabra.",
    statusMessages: { 400: INVALID_DATA, 409: "Esa palabra ya está en la colección." },
  });
  return body.word.word;
}

export async function createWordsBulk(
  session: Session,
  collectionId: string,
  input: { words: Array<{ term: string; translationEs: string }>; collectionName?: string; collectionSlug?: string },
): Promise<BulkWordsResult> {
  return apiRequest<BulkWordsResult>(`/admin/collections/${collectionId}/words/bulk`, {
    method: "POST",
    session,
    body: input,
    errorMessage: "No se pudo crear la lista de palabras.",
    statusMessages: { 400: "Revisa la lista y los datos de la colección." },
  });
}

export async function previewMissingMedia(session: Session, collectionId: string): Promise<MissingMediaPreview[]> {
  const body = await apiRequest<{ previews: MissingMediaPreview[] }>(`/admin/collections/${collectionId}/images/fill-missing`, { method: "POST", session, errorMessage: "No se pudo preparar la vista previa." });
  return body.previews;
}

export async function confirmMissingMedia(session: Session, collectionId: string, items: MissingMediaPreview[]): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}/images/fill-missing/confirm`, { method: "POST", session, body: { items }, errorMessage: "No se pudo guardar el contenido propuesto." });
}
