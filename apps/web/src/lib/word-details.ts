export const PART_OF_SPEECH_LABELS = {
  NOUN: "Sustantivo",
  VERB: "Verbo",
  ADJECTIVE: "Adjetivo",
  ADVERB: "Adverbio",
  PRONOUN: "Pronombre",
  PREPOSITION: "Preposición",
  CONJUNCTION: "Conjunción",
  DETERMINER: "Determinante",
  INTERJECTION: "Interjección",
  PHRASE: "Expresión",
} as const;

export type PartOfSpeech = keyof typeof PART_OF_SPEECH_LABELS;

export const RELATIONSHIP_LABELS = {
  SYNONYM: "Sinónimo",
  ANTONYM: "Antónimo",
  DERIVED: "Derivada",
  COLLOCATION: "Colocación",
  PHRASAL: "Phrasal verb",
  RELATED: "Relacionada",
} as const;

export type WordRelationshipType = keyof typeof RELATIONSHIP_LABELS;

export type ExampleSentence = { id: string; text: string; translationEs: string | null };
