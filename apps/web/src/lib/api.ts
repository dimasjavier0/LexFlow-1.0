import type { Session } from "@supabase/supabase-js";
import type { CefrLevel } from "./levels";
import type { WordVideo } from "./video-sources";
import type { ExampleSentence, PartOfSpeech, WordRelationshipType } from "./word-details";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error("Missing VITE_API_URL");
}

export type ApiUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name: string | null;
  avatarUrl: string | null;
  pointsTotal: number;
  /** Derived from the points: level n starts at (n - 1)² × 100. */
  level: number;
  pointsIntoLevel: number;
  pointsForLevel: number;
  /** Consecutive days with at least one review; 0 once a day is missed. */
  streakCurrent: number;
  streakBest: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiCollectionSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  _count: { words: number };
};

export type ApiWord = {
  id: string;
  term: string;
  translationEs: string;
  level: string;
  partOfSpeech: PartOfSpeech | null;
  sentences: ExampleSentence[];
  relationsFrom: Array<{ id: string; type: WordRelationshipType; target: { term: string; translationEs: string } }>;
  images: Array<{ id: string; url: string; attribution: string | null }>;
  audios: Array<{ id: string; url: string }>;
  videos: Array<WordVideo & { id: string }>;
};

export type ApiCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  words: Array<{ position: number; word: ApiWord }>;
};

export type LearningStatus = "WANT_TO_LEARN" | "NOT_INTERESTED" | "LEARNED";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Failures that mean the same thing on every endpoint. */
const COMMON_STATUS_MESSAGES: Record<number, string> = {
  401: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  403: "No tienes permiso para hacer esto.",
  429: "Demasiadas peticiones seguidas. Espera un momento e inténtalo de nuevo.",
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  session?: Session | null;
  /** JSON payload, or FormData for file uploads. */
  body?: unknown;
  /** User-facing message thrown when the request fails. */
  errorMessage?: string;
  /** Per-status overrides of `errorMessage`, e.g. `{ 409: "Ya existe." }`. */
  statusMessages?: Record<number, string>;
  /** Show the API's own `message` (only for endpoints that answer in Spanish). */
  preferServerMessage?: boolean;
  /** Called after each item of a long request. Only the endpoints that work through several items report steps. */
  onProgress?: (progress: ApiProgress) => void;
};

/** One step of a long request: how far it is and its tallies so far. */
export type ApiProgress<Count extends string = string> = {
  done: number;
  total: number;
  /** Name of the item that just finished. */
  item?: string;
  counts: Record<Count, number>;
};

const PROGRESS_CONTENT_TYPE = "application/x-ndjson";

/** Reads a progress stream: one JSON line per step, with the response body in the last one. */
async function readProgressStream<T>(stream: ReadableStream<Uint8Array>, onProgress: (progress: ApiProgress) => void, errorMessage: string): Promise<T> {
  const outcome: { body?: T } = {};
  const readLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as { type: "progress" } & ApiProgress | { type: "result"; body: T } | { type: "error" };
    if (event.type === "progress") onProgress({ done: event.done, total: event.total, item: event.item, counts: event.counts });
    else if (event.type === "result") outcome.body = event.body;
  };

  try {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const lines = (pending + decoder.decode(value, { stream: true })).split("\n");
      pending = lines.pop() ?? "";
      lines.forEach(readLine);
    }
    readLine(pending);
  } catch {
    throw new ApiError("Se perdió la conexión con el servidor antes de terminar. Recarga para ver qué se guardó.", 0);
  }
  // The server closes the stream without a result when it fails halfway.
  if (!("body" in outcome)) throw new ApiError(errorMessage, 500);
  return outcome.body as T;
}

/** Single entry point for API calls: auth header, JSON encoding and error mapping. */
export async function apiRequest<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", session, body, errorMessage = "No se pudo completar la operación.", statusMessages, preferServerMessage = false, onProgress } = options;
  const headers: Record<string, string> = {};
  if (onProgress) headers.Accept = `${PROGRESS_CONTENT_TYPE}, application/json`;
  if (session) headers.Authorization = `Bearer ${session.access_token}`;
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", 0);
  }

  if (onProgress && response.ok && response.body && response.headers.get("content-type")?.startsWith(PROGRESS_CONTENT_TYPE)) {
    return readProgressStream<T>(response.body, onProgress, errorMessage);
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const serverMessage = preferServerMessage && typeof (payload as { message?: unknown } | null)?.message === "string" ? (payload as { message: string }).message : null;
    throw new ApiError(serverMessage ?? statusMessages?.[response.status] ?? COMMON_STATUS_MESSAGES[response.status] ?? errorMessage, response.status);
  }
  return payload as T;
}

function levelQuery(level: CefrLevel | null): string {
  return level ? `?level=${level}` : "";
}

export type CollectionCatalog = {
  collections: ApiCollectionSummary[];
  /** Levels that have at least one published word, for the level selector. */
  levels: CefrLevel[];
};

/** Published collections, optionally narrowed (and counted) by CEFR level. */
export async function getCollections(level: CefrLevel | null = null): Promise<CollectionCatalog> {
  return apiRequest<CollectionCatalog>(`/collections${levelQuery(level)}`, { errorMessage: "No se pudieron cargar las colecciones." });
}

export async function getCollection(slug: string, level: CefrLevel | null = null): Promise<ApiCollection> {
  const body = await apiRequest<{ collection: ApiCollection }>(`/collections/${encodeURIComponent(slug)}${levelQuery(level)}`, {
    errorMessage: "No se pudo cargar la colección.",
    statusMessages: { 404: "Esta colección no existe o todavía no está publicada." },
  });
  return body.collection;
}

export async function getCurrentUser(session: Session): Promise<ApiUser> {
  const body = await apiRequest<{ user: ApiUser }>("/me", { session, errorMessage: "No se pudo sincronizar el usuario con la API." });
  return body.user;
}

export async function updateProgress(session: Session, wordId: string, status: LearningStatus): Promise<void> {
  await apiRequest(`/progress/${encodeURIComponent(wordId)}`, { method: "PUT", session, body: { status }, errorMessage: "No se pudo guardar tu progreso." });
}

export async function getProgress(session: Session): Promise<Record<string, LearningStatus>> {
  const body = await apiRequest<{ progress: Array<{ wordId: string; status: LearningStatus }> }>("/progress", { session, errorMessage: "No se pudo cargar tu progreso." });
  return Object.fromEntries(body.progress.map((item) => [item.wordId, item.status]));
}

/** Number of learned words per collection id. */
export async function getProgressSummary(session: Session, level: CefrLevel | null = null): Promise<Record<string, number>> {
  const body = await apiRequest<{ summary: Array<{ collectionId: string; learned: number }> }>(`/progress/summary${levelQuery(level)}`, { session, errorMessage: "No se pudo cargar tu progreso." });
  return Object.fromEntries(body.summary.map((item) => [item.collectionId, item.learned]));
}

export type ReviewResult = "correct" | "hard" | "incorrect";
export type SrsStage = "NEW" | "LEARNING" | "MASTERED";

/** How much help a review gives, from 1 (half the word is filled in) to 4 (typed from memory). */
export type ReviewLevel = 1 | 2 | 3 | 4;

export type ReviewItem = {
  stage: SrsStage;
  repetitions: number;
  level: ReviewLevel;
  word: Pick<ApiWord, "id" | "term" | "translationEs" | "level" | "partOfSpeech" | "sentences"> & {
    images: Array<{ id: string; url: string }>;
    audios: Array<{ id: string; url: string }>;
  };
};

export type ReviewOutcome = {
  progress: { wordId: string; stage: SrsStage; repetitions: number; intervalDays: number; nextReviewAt: string };
  becameMastered: boolean;
  pointsEarned: number;
  stats: { pointsTotal: number; level: number; streakCurrent: number; streakBest: number };
};

/** Words due for spaced-repetition review, most overdue first. `total` may exceed the page. */
export async function getDueReviews(session: Session, limit: number): Promise<{ total: number; items: ReviewItem[] }> {
  return apiRequest(`/reviews/due?limit=${limit}`, { session, errorMessage: "No se pudieron cargar tus repasos." });
}

export async function submitReview(session: Session, wordId: string, result: ReviewResult): Promise<ReviewOutcome> {
  return apiRequest<ReviewOutcome>(`/reviews/${encodeURIComponent(wordId)}`, { method: "POST", session, body: { result }, errorMessage: "No se pudo guardar tu respuesta." });
}

export type Dashboard = {
  user: ApiUser;
  words: { wantToLearn: number; learned: number; notInterested: number };
  review: {
    due: number;
    new: number;
    learning: number;
    mastered: number;
    /** Words at each review level, lowest first. */
    levels: number[];
    /** Reviews falling on each of the next seven days, today first. */
    upcoming: number[];
  };
};

export async function getDashboard(session: Session): Promise<Dashboard> {
  // The API counts upcoming reviews by the learner's calendar days, so it needs the clock's offset.
  return apiRequest<Dashboard>(`/me/dashboard?tzOffset=${new Date().getTimezoneOffset()}`, { session, errorMessage: "No se pudo cargar tu progreso." });
}

export async function updateProfile(session: Session, input: { name: string | null; avatarUrl: string | null }): Promise<ApiUser> {
  const body = await apiRequest<{ user: ApiUser }>("/me", {
    method: "PATCH",
    session,
    body: input,
    errorMessage: "No se pudo guardar tu perfil.",
    statusMessages: { 400: "Revisa el nombre y que el avatar sea una URL válida." },
  });
  return body.user;
}

export type WordSearchResult = { id: string; term: string; level: string; collection: { slug: string; name: string } };

/** Published words whose English term starts with `query`. */
export async function searchWords(query: string): Promise<WordSearchResult[]> {
  const body = await apiRequest<{ words: WordSearchResult[] }>(`/words/search?q=${encodeURIComponent(query)}`, { errorMessage: "No se pudo buscar." });
  return body.words;
}
