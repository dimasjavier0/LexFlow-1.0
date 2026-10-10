import { useState } from "react";

type WordAudioProps = {
  audios: Array<{ id: string; url: string }>;
  /** Accessible name of the player. */
  label: string;
};

/**
 * Plays every pronunciation of a word in a row as soon as it is shown.
 * Give it a `key` per word so the sequence restarts when the word changes.
 */
export function WordAudio({ audios, label }: WordAudioProps) {
  const [index, setIndex] = useState(0);
  // Off once the sequence has finished, so rewinding to the first sound does not replay it.
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const current = audios[index];

  if (!current) return <span className="text-xs text-muted">Audio no disponible</span>;

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
