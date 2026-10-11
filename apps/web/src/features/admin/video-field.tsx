import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { VideoPlayer } from "../../components/video-player";
import { YouglishPlayer } from "../../components/youglish-player";
import { Badge, Button, FilterChips, Select } from "../../components/ui";
import { searchVideos, type NewWordVideo } from "../../lib/admin-api";
import { describeVideo, VIDEO_SOURCES, youglishUrl, type VideoSourceId, type WordVideo, type YouglishAccent } from "../../lib/video-sources";
import { Hint, LinkAdder, MediaCarousel, MediaFieldset, MediaSection, useBusyRunner, useDebouncedTerm, useDropStaleSelections, useMediaSearch } from "./media-field";

type VideoFieldProps = {
  session: Session | null;
  /** The word as typed; videos are searched for it once typing pauses. */
  term: string;
  /** Videos the word has, or will have once it is saved. */
  videos: WordVideo[];
  /** Keeps a previewed video or a pasted link. Rejections are reported inline. */
  onAdd: (video: NewWordVideo) => void | Promise<void>;
  onRemove: (video: WordVideo) => void | Promise<void>;
};

const PREVIEW_CLASSES = "mx-auto w-full max-w-xl";

/**
 * The "Videos" section of every word form, built like the sound one: it lists the word's
 * videos, searches the chosen source to watch before keeping one, and accepts a pasted link.
 * Nothing is searched until a source is picked, so opening a form makes no outside requests.
 * The parent decides what `onAdd` and `onRemove` do (store now, or remember until the word is created).
 */
export function VideoField({ session, term, videos, onAdd, onRemove }: VideoFieldProps) {
  const [source, setSource] = useState<VideoSourceId | "">("");
  const [accent, setAccent] = useState<YouglishAccent>("us");
  // null until YouGlish answers for the current word and accent.
  const [youglishTotal, setYouglishTotal] = useState<number | null>(null);
  const searchTerm = useDebouncedTerm(term);
  const runner = useBusyRunner();
  const { busy, run } = runner;
  // YouGlish has no server search: its player fetches the clips itself.
  const searchedSource = source && source !== "youglish" ? source : null;
  const { search, retry } = useMediaSearch(
    session && searchedSource && searchTerm ? `${searchedSource}|${searchTerm}` : null,
    () => (session && searchedSource ? searchVideos(session, searchedSource, searchTerm) : Promise.resolve([])),
  );
  useDropStaleSelections(videos, searchTerm, onRemove);
  useEffect(() => setYouglishTotal(null), [accent, searchTerm]);

  const sourceInfo = VIDEO_SOURCES.find((item) => item.value === source);
  const hasVideo = (url: string) => videos.some((video) => video.url === url);
  const add = (video: NewWordVideo) => void run(`add:${video.url}`, () => onAdd(video), "No se pudo guardar el video.");
  const youglishVideo: NewWordVideo = { url: youglishUrl(searchTerm, accent), provider: "youglish", metadata: { kind: "youglish", query: searchTerm, accent, text: searchTerm } };

  return (
    <MediaFieldset legend="Videos" error={runner.error}>
      {videos.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 p-0" aria-label="Videos de la palabra">
          {videos.map((video) => (
            <li key={video.id ?? video.url} className="grid min-w-0 content-start gap-1">
              <VideoPlayer video={video} term={term} />
              <div className="flex items-center justify-between gap-2">
                <small className="min-w-0 truncate text-xs text-muted">{describeVideo(video)}</small>
                <Button variant="ghost" size="sm" isLoading={busy === `remove:${video.url}`} loadingLabel="Quitando…" disabled={busy !== null} onClick={() => void run(`remove:${video.url}`, () => onRemove(video), "No se pudo quitar el video.")}>
                  Quitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : <Hint>Sin videos.</Hint>}

      <MediaSection title="Buscar videos">
        <FilterChips<VideoSourceId | ""> label="Fuente" options={VIDEO_SOURCES} value={source} onChange={setSource} />
        <Hint>{sourceInfo ? sourceInfo.hint : "Elige una fuente para ver videos de la palabra antes de guardar ninguno."}</Hint>

        {source === "youglish" ? (
          searchTerm ? (
            <div className="grid gap-2">
              <Select className="w-auto justify-self-start py-1.5" aria-label="Acento" value={accent} onChange={(event) => setAccent(event.target.value as YouglishAccent)}>
                <option value="us">Inglés (EE. UU.)</option>
                <option value="uk">Inglés (Reino Unido)</option>
              </Select>
              <div className={PREVIEW_CLASSES}>
                <YouglishPlayer query={searchTerm} accent={accent} onResults={setYouglishTotal} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasVideo(youglishVideo.url) ? (
                  <Badge>✓ Ya está añadido</Badge>
                ) : (
                  <Button size="sm" isLoading={busy === `add:${youglishVideo.url}`} loadingLabel="Guardando…" disabled={!youglishTotal || busy !== null} onClick={() => add(youglishVideo)}>
                    Usar YouGlish en esta palabra
                  </Button>
                )}
                {youglishTotal ? <small className="text-xs text-muted">{youglishTotal} clips. El estudiante podrá recorrerlos todos.</small> : null}
              </div>
            </div>
          ) : <Hint>Escribe la palabra para buscarla en YouGlish.</Hint>
        ) : null}

        {searchedSource ? (
          <MediaCarousel
            search={search}
            onRetry={retry}
            label="Video"
            texts={{
              idle: "Escribe la palabra y se buscarán videos para que los veas antes de guardar.",
              searching: `Buscando videos de “${searchTerm}” en ${sourceInfo?.label}…`,
              empty: `${sourceInfo?.label} no tiene videos de “${searchTerm}”.`,
            }}
          >
            {(candidate) => (
              <>
                {/* Keyed so switching videos stops the previous one. */}
                <div className={PREVIEW_CLASSES}>
                  <VideoPlayer key={candidate.url} video={candidate} term={searchTerm} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <small className="min-w-0 flex-1 basis-56 text-xs text-muted">{[candidate.metadata.title, describeVideo(candidate)].filter(Boolean).join(" · ")}</small>
                  {hasVideo(candidate.url) ? (
                    <Badge>✓ Ya está añadido</Badge>
                  ) : (
                    <Button size="sm" isLoading={busy === `add:${candidate.url}`} loadingLabel="Guardando…" disabled={busy !== null} onClick={() => add({ ...candidate, metadata: { ...candidate.metadata, text: searchTerm } })}>
                      Usar este video
                    </Button>
                  )}
                </div>
              </>
            )}
          </MediaCarousel>
        ) : null}
      </MediaSection>

      <LinkAdder
        label="Enlace de un video propio (opcional)"
        placeholder="Opcional: pega el enlace de un video (mp4, YouTube, Dailymotion…)"
        isTaken={hasVideo}
        runner={runner}
        onAdd={(url) => onAdd({ url, provider: "manual" })}
        renderPreview={(url) => <div className={PREVIEW_CLASSES}><VideoPlayer key={url} video={{ url }} term={term} /></div>}
      />
    </MediaFieldset>
  );
}
