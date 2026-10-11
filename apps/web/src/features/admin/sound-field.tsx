import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Badge, Button, Select } from "../../components/ui";
import { searchRecordedAudios, type NewWordAudio } from "../../lib/admin-api";
import { canSpeak, speak, stopSpeaking } from "../../lib/speech";
import { Hint, LinkAdder, MediaCarousel, MediaFieldset, MediaSection, useBusyRunner, useDebouncedTerm, useDropStaleSelections, useMediaSearch } from "./media-field";

type Accent = "US" | "UK";

/** A sound of the word: stored ones carry an `id`, ones picked for an unsaved word do not. */
export type SoundItem = { id?: string; url: string; accent?: string | null; provider?: string | null; metadata?: Record<string, unknown> };

type SoundFieldProps = {
  session: Session | null;
  /** The word as typed; recordings are searched for it once typing pauses. */
  term: string;
  /** Sounds the word has, or will have once it is saved. */
  sounds: SoundItem[];
  /** Keeps a previewed recording or a pasted link. Rejections are reported inline. */
  onAdd: (audio: NewWordAudio) => void | Promise<void>;
  onRemove: (sound: SoundItem) => void | Promise<void>;
  /** Synthesizes the word on the server. Only possible once the word exists, so omit it before that. */
  onGenerate?: (accent: Accent) => Promise<void>;
};

const PROVIDER_LABELS: Record<string, string> = { wikimedia: "Grabación real", piper: "Voz sintética", manual: "Enlace propio" };

function describe(sound: SoundItem): string {
  const artist = typeof sound.metadata?.artist === "string" ? sound.metadata.artist : null;
  const license = typeof sound.metadata?.license === "string" ? sound.metadata.license : null;
  return [PROVIDER_LABELS[sound.provider ?? "manual"] ?? sound.provider, sound.accent, artist, license].filter(Boolean).join(" · ");
}

/**
 * The "Sonido" section of every word form. It lists the word's sounds, searches Wikimedia
 * for recordings to listen to before keeping one, accepts a pasted link, and can fall back
 * to a synthetic voice. It behaves the same for saved and unsaved words: the parent decides
 * what `onAdd` and `onRemove` do (store now, or remember until the word is created).
 */
export function SoundField({ session, term, sounds, onAdd, onRemove, onGenerate }: SoundFieldProps) {
  const [accent, setAccent] = useState<Accent>("US");
  const searchTerm = useDebouncedTerm(term);
  const runner = useBusyRunner();
  const { busy, run } = runner;
  const { search, retry } = useMediaSearch(
    session && searchTerm ? `${accent}|${searchTerm}` : null,
    () => (session ? searchRecordedAudios(session, searchTerm, accent) : Promise.resolve([])),
  );
  useDropStaleSelections(sounds, searchTerm, onRemove);
  useEffect(() => stopSpeaking, []);

  const hasSound = (url: string) => sounds.some((sound) => sound.url === url);

  return (
    <MediaFieldset legend="Sonido" error={runner.error}>
      {sounds.length ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Sonidos de la palabra">
          {sounds.map((sound) => (
            <li key={sound.id ?? sound.url} className="flex flex-wrap items-center gap-2">
              <audio className="h-9 min-w-0 flex-1 basis-56" controls preload="none" src={sound.url} aria-label={`Sonido de ${term}`} />
              <small className="text-xs text-muted">{describe(sound)}</small>
              <Button variant="ghost" size="sm" isLoading={busy === `remove:${sound.url}`} loadingLabel="Quitando…" disabled={busy !== null} onClick={() => void run(`remove:${sound.url}`, () => onRemove(sound), "No se pudo quitar el sonido.")}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Hint>Sin sonido: los estudiantes oirán la voz de su navegador.</Hint>
          {canSpeak() && term.trim() ? <Button variant="ghost" size="sm" onClick={() => speak(term, accent)}>🔊 Oír esa voz</Button> : null}
        </div>
      )}

      <MediaSection
        title="Buscar grabaciones"
        controls={(
          <Select className="w-auto py-1.5" aria-label="Acento preferido" value={accent} onChange={(event) => setAccent(event.target.value as Accent)}>
            <option value="US">Inglés (EE. UU.)</option>
            <option value="UK">Inglés (Reino Unido)</option>
          </Select>
        )}
      >
        <MediaCarousel
          search={search}
          onRetry={retry}
          label="Grabación"
          texts={{
            idle: "Escribe la palabra y se buscarán grabaciones para que las escuches antes de guardar.",
            searching: `Buscando grabaciones de “${searchTerm}”…`,
            empty: `No hay grabaciones de “${searchTerm}”.`,
          }}
        >
          {(recording, index) => (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {/* Keyed so switching recordings stops the previous one. */}
                <audio key={recording.url} className="h-9 min-w-0 flex-1 basis-56" controls preload="none" src={recording.url} aria-label={`Grabación ${index + 1} de ${searchTerm}`} />
                {hasSound(recording.url) ? (
                  <Badge>✓ Ya está añadido</Badge>
                ) : (
                  <Button size="sm" isLoading={busy === `add:${recording.url}`} loadingLabel="Guardando…" disabled={busy !== null} onClick={() => void run(`add:${recording.url}`, () => onAdd(recording), "No se pudo guardar el sonido.")}>
                    Usar este sonido
                  </Button>
                )}
              </div>
              <small className="text-xs text-muted">{describe(recording)}</small>
            </>
          )}
        </MediaCarousel>
      </MediaSection>

      <LinkAdder
        label="Enlace de un sonido propio (opcional)"
        placeholder="Opcional: pega el enlace de otro sonido (https://…)"
        isTaken={hasSound}
        runner={runner}
        onAdd={(url) => onAdd({ url, provider: "manual" })}
        renderPreview={(url) => <audio className="h-9 w-full" controls preload="none" src={url} aria-label="Vista previa del enlace pegado" />}
      />

      {onGenerate ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button variant="ghost" size="sm" isLoading={busy === "generate"} loadingLabel="Generando…" disabled={busy !== null} onClick={() => void run("generate", () => onGenerate(accent), "No se pudo generar el audio.")}>
            Generar voz sintética
          </Button>
          <Hint>Última opción si ninguna grabación te sirve. Usa el acento elegido arriba.</Hint>
        </div>
      ) : null}
    </MediaFieldset>
  );
}
