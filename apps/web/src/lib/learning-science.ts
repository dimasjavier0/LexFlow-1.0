/**
 * Findings of language-learning research that the progress page plots. Vocabulary sizes are
 * counted in word families (run, runs and running are one) among the most frequent of English.
 */

export const SOURCES = {
  nation: { label: "Nation (2006)", href: "https://www.wgtn.ac.nz/__data/assets/pdf_file/0018/1626120/2006-How-large-a-vocab.pdf" },
  ebbinghaus: { label: "Ebbinghaus (1885), replicado por Murre y Dros (2015)", href: "https://doi.org/10.1371/journal.pone.0120644" },
  cepeda: { label: "Cepeda et al. (2006)", href: "https://doi.org/10.1037/0033-2909.132.3.354" },
  roediger: { label: "Roediger y Karpicke (2006)", href: "https://doi.org/10.1111/j.1467-9280.2006.01693.x" },
} as const;

/**
 * Share of the running words of a novel that are familiar when the most frequent `words`
 * families are known, proper nouns included. Nation (2006), table 5.
 */
export const TEXT_COVERAGE: ReadonlyArray<{ words: number; coverage: number }> = [
  { words: 1000, coverage: 82.93 },
  { words: 2000, coverage: 90.14 },
  { words: 3000, coverage: 93.28 },
  { words: 4000, coverage: 95.06 },
  { words: 5000, coverage: 96.13 },
  { words: 6000, coverage: 96.88 },
  { words: 7000, coverage: 97.43 },
  { words: 8000, coverage: 97.9 },
  { words: 9000, coverage: 98.22 },
];

/** 95 % leaves one unknown word in twenty; 98 % one in fifty, the least for reading unaided (Nation, 2006). */
export const COVERAGE_THRESHOLDS = [
  { coverage: 95, label: "Lectura con ayuda" },
  { coverage: 98, label: "Lectura cómoda" },
] as const;

/** What each vocabulary size is enough for, according to Nation (2006). */
export const VOCABULARY_MILESTONES: ReadonlyArray<{ words: number; title: string; detail: string }> = [
  { words: 1000, title: "Las más frecuentes", detail: "Reconoces unas 8 de cada 10 palabras de cualquier texto." },
  { words: 2000, title: "Inglés cotidiano", detail: "9 de cada 10 palabras de una novela ya te suenan." },
  { words: 3000, title: "Conversación", detail: "Cubres el 95 % del inglés hablado: sigues una charla." },
  { words: 6000, title: "Radio y películas", detail: "El 98 % del inglés hablado, que pide entre 6000 y 7000." },
  { words: 9000, title: "Lectura sin diccionario", detail: "El 98 % de novelas y periódicos, que piden entre 8000 y 9000." },
];

/**
 * How much of a memorised list is kept without reviewing it, measured as the time saved
 * when learning it again. Ebbinghaus (1885).
 */
export const FORGETTING_CURVE: ReadonlyArray<{ after: string; /** Short form of `after`, for a crowded axis. */ tick: string; retained: number }> = [
  { after: "0", tick: "0", retained: 100 },
  { after: "20 min", tick: "20 min", retained: 58.2 },
  { after: "1 h", tick: "1 h", retained: 44.2 },
  { after: "9 h", tick: "9 h", retained: 35.8 },
  { after: "1 día", tick: "1 d", retained: 33.7 },
  { after: "2 días", tick: "2 d", retained: 27.8 },
  { after: "6 días", tick: "6 d", retained: 25.4 },
  { after: "31 días", tick: "31 d", retained: 21.1 },
];

/** Where LexFlow's first two reviews of a word fall on that curve: a day and six days after learning it. */
export const FIRST_REVIEWS = [
  { after: "1 día", label: "1.er repaso" },
  { after: "6 días", label: "2.º repaso" },
] as const;
