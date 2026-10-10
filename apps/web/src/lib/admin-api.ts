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

export type NewWordImage = { url: string; source: "pixabay" | "manual"; attribution?: string; metadata?: Record<string, unknown> };

export type PixabayImage = { id: number; previewUrl: string; url: string; pageUrl: string; tags: string; user: string };

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

export async function searchImages(session: Session, query: string, page: number): Promise<PixabayImage[]> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  const body = await apiRequest<{ images: PixabayImage[] }>(`/admin/pixabay/images?${params.toString()}`, {
    session,
    errorMessage: "No se pudieron buscar imágenes.",
    statusMessages: { 502: "Pixabay no respondió. Inténtalo de nuevo.", 503: "La búsqueda de Pixabay no está configurada en el servidor." },
  });
  return body.images;
}

export async function updateWord(
  session: Session,
  wordId: string,
  input: { term: string; translationEs: string; level: string; images?: NewWordImage[] },
): Promise<AdminWord> {
  const body = await apiRequest<{ word: AdminWord }>(`/admin/words/${wordId}`, {
    method: "PATCH",
    session,
    body: input,
    errorMessage: "No se pudo guardar la palabra.",
    statusMessages: { 400: INVALID_DATA, 409: "Ya existe otra palabra con ese término." },
  });
  return body.word;
}

export async function uploadWordImage(session: Session, wordId: string, file: File): Promise<{ id: string; url: string }> {
  const data = new FormData();
  data.append("image", file);
  const body = await apiRequest<{ image: { id: string; url: string } }>(`/admin/words/${wordId}/images`, {
    method: "POST",
    session,
    body: data,
    errorMessage: "La palabra se guardó, pero la imagen no pudo subirse.",
  });
  return body.image;
}

export async function addWordVideo(session: Session, wordId: string, url: string): Promise<{ id: string; url: string }> {
  const body = await apiRequest<{ resource: { id: string; url: string } }>(`/admin/words/${wordId}/media`, {
    method: "POST",
    session,
    body: { type: "video", url },
    errorMessage: "La palabra se guardó, pero el video no pudo asociarse.",
  });
  return body.resource;
}

export async function deleteWordImage(session: Session, imageId: string): Promise<void> {
  await apiRequest(`/admin/images/${imageId}`, { method: "DELETE", session, errorMessage: "No se pudo eliminar la imagen." });
}

export async function deleteWordVideo(session: Session, videoId: string): Promise<void> {
  await apiRequest(`/admin/videos/${videoId}`, { method: "DELETE", session, errorMessage: "No se pudo eliminar el video." });
}

export async function deleteWordAudio(session: Session, audioId: string): Promise<void> {
  await apiRequest(`/admin/audios/${audioId}`, { method: "DELETE", session, errorMessage: "No se pudo eliminar el sonido." });
}

export async function generateWordAudio(session: Session, wordId: string, accent: "US" | "UK"): Promise<AdminAudio> {
  // The API explains Piper failures (missing model, binary not found) in Spanish.
  const body = await apiRequest<{ audio: AdminAudio }>(`/admin/words/${wordId}/audio/generate`, {
    method: "POST",
    session,
    body: { accent },
    errorMessage: "No se pudo generar el audio.",
    preferServerMessage: true,
  });
  return body.audio;
}
