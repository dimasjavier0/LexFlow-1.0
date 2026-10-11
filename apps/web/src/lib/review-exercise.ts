import type { ReviewLevel } from "./api";

/**
 * The review asks for the same thing at every level, the English word, but with less help
 * each time: recalling it with support first and unaided last is what makes it stick.
 */
export const REVIEW_LEVEL_INFO: Record<ReviewLevel, { name: string; instruction: string; description: string }> = {
  1: { name: "Completar", instruction: "Faltan algunas letras: colócalas en orden.", description: "Media palabra ya está escrita." },
  2: { name: "Ordenar", instruction: "Ordena las letras para formar la palabra.", description: "Tienes sus letras, desordenadas." },
  3: { name: "Elegir", instruction: "Forma la palabra. Ojo: sobran letras.", description: "Sus letras, mezcladas con otras." },
  4: { name: "Escribir", instruction: "Escribe la palabra de memoria.", description: "La escribes sin ayuda." },
};

export const REVIEW_LEVEL_COUNT = 4;

/** One character of the word to rebuild. A blank's `char` is the lowercase letter it expects. */
export type Slot = { kind: "fixed" | "given" | "blank"; char: string };

export type LetterExercise = {
  slots: Slot[];
  /** Letters to place, shuffled; at level 3 some of them do not belong to the word. */
  bank: string[];
};

const LETTER = /[\p{L}\p{N}]/u;
const ALPHABET = [..."abcdefghijklmnopqrstuvwxyz"];
const MAX_SHUFFLES = 10;

export function isLetter(char: string): boolean {
  return LETTER.test(char);
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Shuffles until the letters no longer read as the answer, which a short word often would. */
function scrambled(letters: string[], answer: string[], random: () => number): string[] {
  const solution = answer.join("");
  let bank = shuffled(letters, random);
  for (let attempt = 0; attempt < MAX_SHUFFLES && bank.join("").startsWith(solution); attempt++) bank = shuffled(letters, random);
  return bank;
}

/**
 * The letters to place for a word at a level below 4. Spaces and punctuation are never
 * asked for. Level 1 keeps the first letter and enough others to show half the word.
 */
export function buildExercise(term: string, level: Exclude<ReviewLevel, 4>, random: () => number = Math.random): LetterExercise {
  const chars = [...term.trim().replace(/\s+/g, " ")];
  const letterPositions = chars.flatMap((char, index) => (isLetter(char) ? [index] : []));

  const given = new Set<number>();
  if (level === 1 && letterPositions.length > 1) {
    const [first, ...rest] = letterPositions;
    given.add(first);
    for (const position of shuffled(rest, random).slice(0, Math.floor(letterPositions.length / 2) - 1)) given.add(position);
  }

  const slots = chars.map((char, index): Slot => {
    if (!isLetter(char)) return { kind: "fixed", char };
    return given.has(index) ? { kind: "given", char } : { kind: "blank", char: char.toLowerCase() };
  });
  const answer = slots.flatMap((slot) => (slot.kind === "blank" ? [slot.char] : []));
  const extras = level === 3 ? shuffled(ALPHABET.filter((letter) => !answer.includes(letter)), random).slice(0, Math.min(4, Math.max(2, Math.round(answer.length / 3)))) : [];
  return { slots, bank: scrambled([...answer, ...extras], answer, random) };
}

export function blankCount(exercise: LetterExercise): number {
  return exercise.slots.filter((slot) => slot.kind === "blank").length;
}

/** The word as it stands: `picked` holds the bank positions placed so far, which fill the blanks in order. */
export function composeAnswer(exercise: LetterExercise, picked: number[]): string {
  let blank = 0;
  return exercise.slots.map((slot) => (slot.kind === "blank" ? (exercise.bank[picked[blank++]] ?? "") : slot.char)).join("");
}
