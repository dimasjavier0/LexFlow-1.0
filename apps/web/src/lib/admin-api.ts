import type { Session } from "@supabase/supabase-js";
import { apiRequest } from "./api";
import { VIDEO_SOURCES, type VideoSourceId, type WordVideo } from "./video-sources";
import type { ExampleSentence, PartOfSpeech, WordRelationshipType } from "./word-details";

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

export type AdminWordRelation = { id: string; type: WordRelationshipType; target: { id: string; term: string } };

/** Editable fields of a word, shared by create and update. */
export type WordFields = {
  term: string;
  translationEs: string;
  level: string;
  partOfSpeech?: PartOfSpeech | null;
  frequencyRank?: number | null;
  images?: NewWordImage[];
};

export type AdminWord = {
  id: string;
  term: string;
  translationEs: string;
  level: string;
  isPublished: boolean;
  partOfSpeech: PartOfSpeech | null;
  frequencyRank: number | null;
  sentences: ExampleSentence[];
  relationsFrom: AdminWordRelation[];
  images: Array<{ id: string; url: string }>;
  audios: AdminAudio[];
  videos: Array<WordVideo & { id: string }>;
};

export type NewWordImage = { url: string; source: "pixabay" | "manual"; attribution?: string; metadata?: Record<string, unknown> };

export type PixabayImage = { id: number; previewUrl: string; url: string; pageUrl: string; tags: string; user: string };

export type MissingMediaPreview = {
  wordId: string;
  term: string;
  images: Array<{ url: string; attribution: string; metadata: Record<string, unknown> }>;
  audio: { url: string; provider: string; voice: string; accent: string; metadata: Record<string, unknown> } | null;
};

/** A sound that is not stored yet: a recording found by the API or a link pasted by the admin. */
export type NewWordAudio = { url: string; provider?: string; accent?: string | null; metadata?: Record<string, unknown> };

/** A video that is not stored yet: one found by a search, YouGlish for the word, or a pasted link. */
export type NewWordVideo = Omit<WordVideo, "id"> & { license?: string | null };

/** A search result, as the API describes it. */
export type VideoCandidate = NewWordVideo & {
  provider: string;
  metadata: { kind: "file" | "embed"; externalId: string; thumbnailUrl: string | null; duration: number | null; title: string | null; pageUrl: string };
};

export type BulkWordsResult = { words: AdminWord[]; skipped: number; received: number; failedAudio: number; collectionId: string; collectionCreated: boolean };

const INVALID_DATA = "Revisa los datos del formulario.";
const IMAGE_DOWNLOAD_FAILED = "No se pudieron descargar las imágenes de Pixabay. Búscalas de nuevo e inténtalo otra vez.";
const COVER_DOWNLOAD_FAILED = "No se pudo descargar la imagen de Pixabay. Búscala de nuevo e inténtalo otra vez.";

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
    statusMessages: { 400: "Revisa el nombre, el slug (minúsculas, números y guiones) y la URL de la imagen.", 409: "Ya existe una colección con ese slug.", 502: COVER_DOWNLOAD_FAILED },
  });
}

export async function updateCollection(session: Session, collectionId: string, input: { name: string; description: string | null; imageUrl: string | null }): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}`, {
    method: "PATCH",
    session,
    body: input,
    errorMessage: "No se pudo actualizar la colección.",
    statusMessages: { 400: "Revisa el nombre y la URL de la imagen.", 502: COVER_DOWNLOAD_FAILED },
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
  input: WordFields,
): Promise<AdminWord> {
  const body = await apiRequest<{ word: { word: AdminWord } }>(`/admin/collections/${collectionId}/words`, {
    method: "POST",
    session,
    body: { ...input, isPublished: false },
    errorMessage: "No se pudo crear la palabra.",
    statusMessages: { 400: INVALID_DATA, 409: "Esa palabra ya está en la colección.", 502: IMAGE_DOWNLOAD_FAILED },
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

/** Looks for human recordings of the term, with the preferred accent first. */
export async function searchRecordedAudios(session: Session, term: string, accent: "US" | "UK"): Promise<NewWordAudio[]> {
  const params = new URLSearchParams({ term, accent });
  const body = await apiRequest<{ audios: NewWordAudio[] }>(`/admin/audio/recorded?${params.toString()}`, { session, errorMessage: "No se pudo buscar el sonido." });
  return body.audios;
}

/** Attaches a previewed sound to a word. Only its link is stored. */
export async function addWordAudio(session: Session, wordId: string, audio: NewWordAudio): Promise<AdminAudio> {
  const body = await apiRequest<{ resource: AdminAudio }>(`/admin/words/${wordId}/media`, {
    method: "POST",
    session,
    body: { type: "audio", url: audio.url, provider: audio.provider, accent: audio.accent ?? undefined, metadata: audio.metadata },
    errorMessage: "No se pudo guardar el sonido.",
    statusMessages: { 400: "El enlace del sonido no es válido." },
  });
  return body.resource;
}

export async function updateWord(
  session: Session,
  wordId: string,
  input: WordFields,
): Promise<AdminWord> {
  const body = await apiRequest<{ word: AdminWord }>(`/admin/words/${wordId}`, {
    method: "PATCH",
    session,
    body: input,
    errorMessage: "No se pudo guardar la palabra.",
    statusMessages: { 400: INVALID_DATA, 409: "Ya existe otra palabra con ese término.", 502: IMAGE_DOWNLOAD_FAILED },
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

/** Videos about the term from one source. YouGlish is not searched here: its player fetches the clips itself. */
export async function searchVideos(session: Session, source: Exclude<VideoSourceId, "youglish">, term: string): Promise<VideoCandidate[]> {
  const params = new URLSearchParams({ term, source });
  const envVar = VIDEO_SOURCES.find((item) => item.value === source)?.envVar;
  const body = await apiRequest<{ videos: VideoCandidate[] }>(`/admin/videos/search?${params.toString()}`, {
    session,
    errorMessage: "No se pudieron buscar videos.",
    statusMessages: {
      502: "La fuente no respondió. Inténtalo de nuevo.",
      503: `Esta fuente no está configurada: añade ${envVar ?? "su clave"} al .env del servidor y reinícialo.`,
    },
  });
  return body.videos;
}

/** Attaches a previewed video to a word. Only its link is stored. */
export async function addWordVideo(session: Session, wordId: string, video: NewWordVideo): Promise<AdminWord["videos"][number]> {
  const body = await apiRequest<{ resource: AdminWord["videos"][number] }>(`/admin/words/${wordId}/media`, {
    method: "POST",
    session,
    body: {
      type: "video",
      url: video.url,
      source: video.provider && video.provider !== "manual" ? "search" : "manual",
      provider: video.provider ?? undefined,
      license: video.license ?? undefined,
      attribution: video.attribution?.slice(0, 300) ?? undefined,
      metadata: video.metadata ?? undefined,
    },
    errorMessage: "No se pudo guardar el video.",
    statusMessages: { 400: "El enlace del video no es válido." },
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

export async function setWordPublication(session: Session, wordId: string, isPublished: boolean): Promise<void> {
  await apiRequest(`/admin/words/${wordId}/publication`, { method: "PATCH", session, body: { isPublished }, errorMessage: "No se pudo cambiar el estado de la palabra." });
}

/** Publishes or unpublishes every word of a collection at once. */
export async function setCollectionWordsPublication(session: Session, collectionId: string, isPublished: boolean): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}/words/publication`, { method: "PATCH", session, body: { isPublished }, errorMessage: "No se pudieron publicar las palabras." });
}

export type WordsAction = "publish" | "unpublish" | "repair-images" | "refresh-images" | "delete-images" | "remove";

/** Applies one action to several words of a collection. `failed` counts what an image action could not complete. */
export async function runWordsAction(session: Session, collectionId: string, wordIds: string[], action: WordsAction): Promise<{ affected: number; failed: number }> {
  return apiRequest(`/admin/collections/${collectionId}/words/actions`, {
    method: "POST",
    session,
    body: { wordIds, action },
    errorMessage: "No se pudo aplicar la acción a las palabras seleccionadas.",
    statusMessages: { 400: "Selecciona como máximo 200 palabras a la vez.", 503: "Pixabay no está configurado en el servidor." },
  });
}

/** Downloads every image that still points at an expired Pixabay link. `remaining` is what is left for another run. */
export async function repairImages(session: Session): Promise<{ repaired: number; failed: number; remaining: number }> {
  return apiRequest("/admin/images/repair", {
    method: "POST",
    session,
    errorMessage: "No se pudieron reparar las imágenes.",
    statusMessages: { 503: "Pixabay no está configurado en el servidor." },
  });
}

/** Deletes a collection, along with any word that belonged only to it. */
export async function deleteCollection(session: Session, collectionId: string): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}`, { method: "DELETE", session, errorMessage: "No se pudo eliminar la colección." });
}

/** Removes a word from a collection; the word itself is deleted if no other collection uses it. */
export async function removeWordFromCollection(session: Session, collectionId: string, wordId: string): Promise<void> {
  await apiRequest(`/admin/collections/${collectionId}/words/${wordId}`, { method: "DELETE", session, errorMessage: "No se pudo quitar la palabra." });
}

export async function addWordSentence(session: Session, wordId: string, input: { text: string; translationEs: string | null }): Promise<ExampleSentence> {
  const body = await apiRequest<{ sentence: ExampleSentence }>(`/admin/words/${wordId}/sentences`, { method: "POST", session, body: input, errorMessage: "No se pudo añadir la oración." });
  return body.sentence;
}

export async function deleteWordSentence(session: Session, sentenceId: string): Promise<void> {
  await apiRequest(`/admin/sentences/${sentenceId}`, { method: "DELETE", session, errorMessage: "No se pudo eliminar la oración." });
}

/** Links a word to another existing word, looked up by its English term. */
export async function addWordRelation(session: Session, wordId: string, input: { term: string; type: WordRelationshipType }): Promise<AdminWordRelation> {
  const body = await apiRequest<{ relation: AdminWordRelation }>(`/admin/words/${wordId}/relations`, {
    method: "POST",
    session,
    body: input,
    errorMessage: "No se pudo añadir la relación.",
    statusMessages: {
      400: "Una palabra no puede relacionarse consigo misma.",
      404: `“${input.term}” no existe en la biblioteca. Créala primero.`,
      409: "Esa relación ya existe.",
    },
  });
  return body.relation;
}

export async function deleteWordRelation(session: Session, relationId: string): Promise<void> {
  await apiRequest(`/admin/relations/${relationId}`, { method: "DELETE", session, errorMessage: "No se pudo eliminar la relación." });
}
