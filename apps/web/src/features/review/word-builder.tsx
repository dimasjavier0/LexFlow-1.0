import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { blankCount, isLetter, type LetterExercise, type Slot } from "../../lib/review-exercise";

type WordBuilderProps = {
  exercise: LetterExercise;
  /** Bank positions of the letters placed so far, in the order they were placed. */
  picked: number[];
  onChange: (picked: number[]) => void;
  /** Enter was pressed with every blank filled. */
  onSubmit: () => void;
  disabled?: boolean;
};

type PlacedSlot = Slot & { key: number; blank: number | null };

/** Longer words get narrower boxes so they still fit a phone on one or two lines. */
const LONG_WORD = 8;

/**
 * The word as a row of boxes, with its missing letters offered below as shuffled tiles.
 * A letter is placed by pressing its tile or typing it on a keyboard, and taken back by
 * pressing its box or Backspace.
 */
export function WordBuilder({ exercise, picked, onChange, onSubmit, disabled = false }: WordBuilderProps) {
  const [rejected, setRejected] = useState<string | null>(null);
  const total = blankCount(exercise);
  const isComplete = picked.length === total;

  const place = (position: number) => {
    if (!disabled && !isComplete && !picked.includes(position)) onChange([...picked, position]);
  };
  const removeAt = (blank: number) => {
    if (!disabled) onChange(picked.filter((_, index) => index !== blank));
  };
  const type = (letter: string) => {
    const position = exercise.bank.findIndex((item, index) => item === letter && !picked.includes(index));
    if (position >= 0 && !isComplete) place(position);
    else if (!isComplete) setRejected(letter);
  };

  // Typing works from anywhere on the page, so a keyboard needs no field to click first
  // and a phone is not made to open its own keyboard over the tiles.
  const onKeyRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
  onKeyRef.current = (event) => {
    if (disabled || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      if (picked.length) removeAt(picked.length - 1);
    } else if (event.key === "Enter") {
      // On a button or link, Enter is that control's own action.
      if (target && ["BUTTON", "A"].includes(target.tagName)) return;
      if (isComplete) {
        event.preventDefault();
        onSubmit();
      }
    } else if (event.key.length === 1 && isLetter(event.key)) {
      type(event.key.toLowerCase());
    }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => onKeyRef.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (rejected === null) return;
    const timeout = window.setTimeout(() => setRejected(null), 600);
    return () => window.clearTimeout(timeout);
  }, [rejected]);

  // Words stay whole when the row wraps: it only breaks at the spaces between them.
  const words: PlacedSlot[][] = [[]];
  let blank = 0;
  exercise.slots.forEach((slot, key) => {
    if (slot.kind === "fixed" && slot.char === " ") words.push([]);
    else words.at(-1)?.push({ ...slot, key, blank: slot.kind === "blank" ? blank++ : null });
  });
  const isLong = Math.max(...words.map((word) => word.length)) > LONG_WORD;
  // `cn` only joins class names, so the size is kept apart from the rest instead of being overridden.
  const boxClasses = cn("grid shrink-0 place-items-center rounded-xl border-2 font-bold", isLong ? "h-10 w-8 text-lg" : "h-12 w-10 text-xl");
  const separatorClasses = cn("grid shrink-0 place-items-center font-bold text-muted", isLong ? "h-10 w-3 text-lg" : "h-12 w-4 text-xl");

  const spoken = exercise.slots.map((slot, index) => {
    if (slot.kind !== "blank") return slot.char === " " ? "espacio" : slot.char;
    const position = picked[exercise.slots.slice(0, index).filter((item) => item.kind === "blank").length];
    return position === undefined ? "hueco" : exercise.bank[position];
  }).join(", ");

  return (
    <div className="grid gap-4">
      <div role="group" aria-label="Tu respuesta" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {words.map((word, wordIndex) => (
          <span key={wordIndex} className="flex flex-wrap justify-center gap-1">
            {word.map((slot) => {
              if (slot.kind === "fixed") return <span key={slot.key} aria-hidden="true" className={separatorClasses}>{slot.char}</span>;
              if (slot.kind === "given") return <span key={slot.key} className={cn(boxClasses, "border-transparent bg-teal-soft text-teal-dark")}>{slot.char}</span>;
              const position = slot.blank === null ? undefined : picked[slot.blank];
              if (position === undefined) {
                // The next box to be filled is marked so it is clear where a letter will land.
                return <span key={slot.key} aria-hidden="true" className={cn(boxClasses, "border-dashed bg-paper", slot.blank === picked.length ? "border-teal" : "border-line")} />;
              }
              const letter = exercise.bank[position];
              return (
                <button key={slot.key} type="button" disabled={disabled} aria-label={`Quitar la letra ${letter}`} onClick={() => removeAt(slot.blank ?? 0)} className={cn(boxClasses, "cursor-pointer touch-manipulation border-teal bg-surface text-ink transition-colors hover:bg-teal-soft disabled:cursor-not-allowed")}>
                  {letter}
                </button>
              );
            })}
          </span>
        ))}
      </div>

      <div role="group" aria-label="Letras disponibles" className={cn("flex flex-wrap items-center justify-center gap-2", rejected !== null && "animate-shake")}>
        {exercise.bank.map((letter, position) => {
          const isUsed = picked.includes(position);
          return (
            <button
              key={position}
              type="button"
              disabled={disabled || isUsed || isComplete}
              aria-label={`Letra ${letter}`}
              onClick={() => place(position)}
              className={cn(
                "grid size-12 touch-manipulation place-items-center rounded-xl border-2 text-xl font-bold transition-[transform,background-color,border-color] select-none",
                isUsed ? "border-dashed border-line text-transparent" : "cursor-pointer border-line bg-surface text-ink shadow-card hover:-translate-y-0.5 hover:border-teal hover:bg-teal-soft active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
              )}
            >
              {letter}
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Borrar la última letra"
          title="Borrar la última letra"
          disabled={disabled || !picked.length}
          onClick={() => removeAt(picked.length - 1)}
          className="grid size-12 cursor-pointer touch-manipulation place-items-center rounded-xl text-xl text-muted transition-colors hover:bg-teal-soft hover:text-teal-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">⌫</span>
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {rejected !== null ? `La letra ${rejected} no está entre las disponibles. ` : ""}Respuesta: {spoken}.
      </p>
    </div>
  );
}
