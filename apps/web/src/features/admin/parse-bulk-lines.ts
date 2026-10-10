export type BulkLine = {
  line: number;
  raw: string;
  term: string;
  translationEs: string;
  status: "valid" | "invalid" | "warning" | "empty";
  message: string;
};

export const MAX_BULK_WORDS = 50;

/** Parses "english word, traducción" lines, flagging malformed and repeated entries. */
export function parseBulkLines(value: string): BulkLine[] {
  const seen = new Set<string>();
  return value.split(/\r?\n/).map((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return { line, raw, term: "", translationEs: "", status: "empty", message: "Línea vacía" };
    const separator = trimmed.indexOf(",");
    if (separator < 1 || separator === trimmed.length - 1) return { line, raw, term: "", translationEs: "", status: "invalid", message: "Usa: palabra en inglés, traducción" };
    const term = trimmed.slice(0, separator).trim();
    const translationEs = trimmed.slice(separator + 1).trim();
    if (!term || !translationEs) return { line, raw, term, translationEs, status: "invalid", message: "Falta la palabra o la traducción" };
    const key = term.toLowerCase();
    if (seen.has(key)) return { line, raw, term, translationEs, status: "warning", message: "Palabra repetida; se omitirá el duplicado" };
    seen.add(key);
    return { line, raw, term, translationEs, status: "valid", message: "Línea válida" };
  });
}
