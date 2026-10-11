import { useEffect, useState } from "react";
import { canSpeak, speak, stopSpeaking } from "../lib/speech";

type WordAudioProps = {
  audios: Array<{ id: string; url: string }>;
  /** Accessible name of the player. */
  label: string;
  /** Spoken by the browser when the word has no recording. */
  term: string;
};

/** Stand-in for a missing recording: the browser reads the word aloud, nothing is stored. */
function SpokenWord({ term, label }: { term: string; label: string }) {
  useEffect(() => {
    speak(term);
    return stopSpeaking;
  }, [term]);

  if (!canSpeak()) return <span className="text-xs text-muted">Audio no disponible</span>;
  return (
    <button type="button" aria-label={label} onClick={() => speak(term)} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-teal-soft px-4 text-sm font-extrabold text-teal-dark transition-colors hover:bg-teal-soft/70">
      <span aria-hidden="true">🔊</span>
      Escuchar
      <small className="text-[0.7rem] font-semibold opacity-80">voz del navegador</small>
    </button>
  );
}

/**
 * Plays every pronunciation of a word in a row as soon as it is shown.
 * Give it a `key` per word so the sequence restarts when the word changes.
 */
export function WordAudio({ audios, label, term }: WordAudioProps) {
  const [index, setIndex] = useState(0);
  // Off once the sequence has finished, so rewinding to the first sound does not replay it.
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const current = audios[index];

  if (!current) return <SpokenWord term={term} label={label} />;

  const playNext = () => {
    const isLast = index === audios.length - 1;
    setIndex(isLast ? 0 : index + 1);
    setIsAutoPlaying(!isLast);
  };

  return (
    <div className="flex w-full max-w-sm items-center gap-2">
      <audio className="h-10 min-w-0 flex-1" controls autoPlay={isAutoPlaying} src={current.url} onEnded={playNext} aria-label={label} />
      {audios.length > 1 ? <span className="shrink-0 text-xs font-bold text-muted">{index + 1} / {audios.length}</span> : null}
    </div>
  );
}
