import { normalizeText, slugify } from "../../lib/slug";

export type BulkLine = {
  line: number;
  raw: string;
  term: string;
  translationEs: string;
  status: "valid" | "invalid" | "warning" | "empty" | "heading";
  message: string;
};

/** One list of the pasted text. `title` is null for words written before any heading. */
export type BulkList = { title: string | null; words: Array<{ term: string; translationEs: string }> };

export type ParsedBulk = { lines: BulkLine[]; lists: BulkList[] };

export const MAX_BULK_WORDS = 50;
export const MAX_BULK_LISTS = 10;

const HEADING_PATTERN = /^#{1,6}\s+(.*?)\s*#*$/;
const LIST_MARKER_PATTERN = /^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;
const TABLE_DIVIDER_PATTERN = /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/;
/** Tried in order; the comma is the original format and wins when present. */
const SEPARATORS = [",", "\t", " — ", " – ", " - ", ":", "=", "|"];

/** Drops Markdown emphasis, code and link syntax around a cell. */
function cleanInline(value: string): string {
  return value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_|`|~~)/g, "")
    .trim();
}

function splitPair(text: string): [string, string] | null {
  if (text.startsWith("|")) {
    const cells = text.replace(/^\||\|$/g, "").split("|").map(cleanInline);
    return cells.length >= 2 ? [cells[0], cells[1]] : null;
  }
  for (const separator of SEPARATORS) {
    const index = text.indexOf(separator);
    if (index > 0) return [cleanInline(text.slice(0, index)), cleanInline(text.slice(index + separator.length))];
  }
  return null;
}

/**
 * Parses pasted Markdown into word lists. A heading ("# Animals") starts a list named
 * after it; the lines below are "english word, traducción" pairs, optionally written as
 * list items ("- cat, gato") or table rows ("| cat | gato |"). Malformed lines are
 * flagged, and words repeated within a list (ignoring accents and case) are skipped.
 */
export function parseBulkMarkdown(value: string): ParsedBulk {
  const rawLines = value.split(/\r?\n/);
  const lists = new Map<string, BulkList>();
  const seenByList = new Map<string, Set<string>>();
  let listKey = "";

  const openList = (key: string, title: string | null) => {
    if (!lists.has(key)) {
      lists.set(key, { title, words: [] });
      seenByList.set(key, new Set());
    }
    listKey = key;
  };

  const lines = rawLines.map((raw, index): BulkLine => {
    const line = index + 1;
    const base = { line, raw, term: "", translationEs: "" };
    const trimmed = raw.trim();
    if (!trimmed) return { ...base, status: "empty", message: "Línea vacía" };

    const heading = HEADING_PATTERN.exec(trimmed);
    if (heading) {
      const title = cleanInline(heading[1]);
      if (!slugify(title)) return { ...base, status: "invalid", message: "El título necesita letras o números" };
      if (title.length > 100) return { ...base, status: "invalid", message: "Título demasiado largo" };
      // A repeated title continues the list it opened earlier.
      openList(`#${normalizeText(title)}`, title);
      return { ...base, term: title, status: "heading", message: "Colección" };
    }

    // Table furniture: the divider row and the header row right above it.
    if (TABLE_DIVIDER_PATTERN.test(trimmed)) return { ...base, status: "empty", message: "Separador de tabla" };
    if (trimmed.startsWith("|") && TABLE_DIVIDER_PATTERN.test(rawLines[index + 1]?.trim() ?? "")) return { ...base, status: "empty", message: "Encabezado de tabla" };

    const pair = splitPair(trimmed.replace(LIST_MARKER_PATTERN, ""));
    if (!pair) return { ...base, status: "invalid", message: "Usa: palabra en inglés, traducción" };
    const [term, translationEs] = pair;
    if (!term || !translationEs) return { ...base, term, translationEs, status: "invalid", message: "Falta la palabra o la traducción" };
    if (term.length > 100 || translationEs.length > 200) return { ...base, term, translationEs, status: "invalid", message: "Texto demasiado largo" };

    if (!lists.has(listKey)) openList(listKey, null);
    const seen = seenByList.get(listKey)!;
    const key = normalizeText(term);
    if (seen.has(key)) return { ...base, term, translationEs, status: "warning", message: "Palabra repetida; se omitirá el duplicado" };
    seen.add(key);
    lists.get(listKey)!.words.push({ term, translationEs });
    return { ...base, term, translationEs, status: "valid", message: "Línea válida" };
  });

  return { lines, lists: [...lists.values()].filter((list) => list.words.length > 0) };
}
