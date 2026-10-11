/** A video of a word: stored ones carry an `id`, ones picked for an unsaved word do not. */
export type WordVideo = {
  id?: string;
  url: string;
  provider?: string | null;
  attribution?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type YouglishAccent = "us" | "uk";

export type VideoSourceId = "youglish" | "pixabay" | "pexels" | "dailymotion" | "wikimedia" | "youtube";

type VideoSourceInfo = {
  value: VideoSourceId;
  label: string;
  /** What the source is good for, shown once it is picked. */
  hint: string;
  /** Server variable that enables the source, when it needs an API key. */
  envVar?: string;
};

const DAILYMOTION_PLAYER_ID_PATTERN = /^[a-z0-9]{3,12}$/i;

/**
 * Dailymotion only serves embeds that name a player created in its Studio (the address
 * without one answers 403), so until an id is configured its videos open on its own site.
 */
const dailymotionPlayerId = (() => {
  const id: unknown = import.meta.env.VITE_DAILYMOTION_PLAYER_ID;
  return typeof id === "string" && DAILYMOTION_PLAYER_ID_PATTERN.test(id.trim()) ? id.trim() : null;
})();

export const VIDEO_SOURCES: ReadonlyArray<VideoSourceInfo> = [
  { value: "youglish", label: "YouGlish", hint: "Personas reales diciendo la palabra, con subtítulos. Se reproduce en vivo: no se puede fijar un clip concreto." },
  { value: "pixabay", label: "Pixabay", hint: "Clips cortos sin voz que ilustran la palabra.", envVar: "PIXABAY_API_KEY" },
  { value: "pexels", label: "Pexels", hint: "Clips cortos sin voz que ilustran la palabra.", envVar: "PEXELS_API_KEY" },
  {
    value: "dailymotion",
    label: "Dailymotion",
    hint: dailymotionPlayerId
      ? "Videos con voz, buscados por título. Su reproductor muestra anuncios."
      : "Videos con voz, buscados por título. Se abren en Dailymotion: para verlos aquí, añade VITE_DAILYMOTION_PLAYER_ID al .env y reinicia la web.",
  },
  { value: "wikimedia", label: "Wikimedia", hint: "Video con licencia libre. Catálogo pequeño y a veces en otros idiomas." },
  { value: "youtube", label: "YouTube", hint: "Videos sobre la palabra, buscados por título.", envVar: "YOUTUBE_API_KEY" },
];

const PROVIDER_LABELS: Record<string, string> = { ...Object.fromEntries(VIDEO_SOURCES.map((source) => [source.value, source.label])), manual: "Enlace propio" };

/** How a video has to be shown. Embeds are rebuilt from a validated id, never from a stored URL. */
export type VideoPlayback =
  | { kind: "file"; src: string; poster: string | null }
  | { kind: "embed"; src: string; poster: string | null; site: string }
  | { kind: "youglish"; query: string; accent: YouglishAccent }
  /** Opens elsewhere. `site` is set when the video is a known provider's that cannot be embedded here. */
  | { kind: "link"; href: string; poster: string | null; site: string | null };

const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogv|mov)$/i;
const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;
const DAILYMOTION_ID_PATTERN = /^[a-z0-9]{4,12}$/i;

function httpUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m)\./, "");
  const [first, second] = url.pathname.split("/").filter(Boolean);
  const id = host === "youtu.be"
    ? first
    : host === "youtube.com" || host === "youtube-nocookie.com"
      ? first === "watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(first ?? "") ? second : null
      : null;
  return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
}

function dailymotionId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  const [first, second] = url.pathname.split("/").filter(Boolean);
  const id = host === "dai.ly" ? first : host === "dailymotion.com" && first === "video" ? second : null;
  return id && DAILYMOTION_ID_PATTERN.test(id) ? id : null;
}

export function youglishUrl(query: string, accent: YouglishAccent): string {
  return `https://youglish.com/pronounce/${encodeURIComponent(query.trim())}/english/${accent}`;
}

function youglishQuery(url: URL): { query: string; accent: YouglishAccent } | null {
  if (url.hostname.replace(/^www\./, "") !== "youglish.com") return null;
  const [first, query, , accent] = url.pathname.split("/").filter(Boolean);
  if (first !== "pronounce" || !query) return null;
  try {
    return { query: decodeURIComponent(query), accent: accent === "uk" ? "uk" : "us" };
  } catch {
    return null;
  }
}

export function videoPlayback(video: WordVideo): VideoPlayback {
  const url = httpUrl(video.url);
  if (!url) return { kind: "link", href: "#", poster: null, site: null };
  const poster = httpUrl(video.metadata?.thumbnailUrl)?.href ?? null;

  const youglish = youglishQuery(url);
  if (youglish) return { kind: "youglish", ...youglish };

  const youtube = youtubeId(url);
  if (youtube) return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`, poster: poster ?? `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`, site: "YouTube" };

  const dailymotion = dailymotionId(url);
  if (dailymotion) {
    const shared = { poster: poster ?? `https://www.dailymotion.com/thumbnail/video/${dailymotion}`, site: "Dailymotion" };
    return dailymotionPlayerId
      ? { kind: "embed", src: `https://geo.dailymotion.com/player/${dailymotionPlayerId}.html?video=${dailymotion}`, ...shared }
      : { kind: "link", href: `https://www.dailymotion.com/video/${dailymotion}`, ...shared };
  }

  if (VIDEO_FILE_PATTERN.test(url.pathname) || video.metadata?.kind === "file") return { kind: "file", src: url.href, poster };
  return { kind: "link", href: url.href, poster: null, site: null };
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

/** One line saying where a video comes from, e.g. "Pixabay · NickyPe · 0:20". */
export function describeVideo(video: WordVideo): string {
  const playback = videoPlayback(video);
  const site = playback.kind === "embed" || playback.kind === "link" ? playback.site : null;
  const provider = video.provider ?? (playback.kind === "youglish" ? "youglish" : site?.toLowerCase() ?? "manual");
  const label = PROVIDER_LABELS[provider] ?? provider;
  // Attributions are stored as "Provider: author"; the provider is already the first part of the line.
  const author = video.attribution?.replace(/^[^:]+:\s*/, "") || null;
  const duration = typeof video.metadata?.duration === "number" ? formatDuration(video.metadata.duration) : null;
  const accent = playback.kind === "youglish" ? playback.accent.toUpperCase() : null;
  return [label, accent, author, duration].filter(Boolean).join(" · ");
}
