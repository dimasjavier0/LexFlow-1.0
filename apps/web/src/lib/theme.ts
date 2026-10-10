export type ThemeMode = "light" | "dark";

/** Tones offered in the switcher. Colors live in styles.css; `swatch` only paints the picker. */
export const THEMES = [
  { id: "lagoon", label: "Laguna", swatch: "#159b9b" },
  { id: "ocean", label: "Océano", swatch: "#2f7fd6" },
  { id: "violet", label: "Violeta", swatch: "#7c5cd6" },
  { id: "forest", label: "Bosque", swatch: "#3f9a5f" },
  { id: "sunset", label: "Atardecer", swatch: "#d9617a" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ThemeChoice = { theme: ThemeId; mode: ThemeMode };

// Also read by the inline script in index.html, which applies the choice before first paint.
const THEME_STORAGE_KEY = "lexflow.theme";
const MODE_STORAGE_KEY = "lexflow.mode";

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readThemeChoice(): ThemeChoice {
  const storedTheme = readStored(THEME_STORAGE_KEY);
  const storedMode = readStored(MODE_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return {
    theme: THEMES.find((item) => item.id === storedTheme)?.id ?? "lagoon",
    mode: storedMode === "dark" || storedMode === "light" ? storedMode : prefersDark ? "dark" : "light",
  };
}

export function applyThemeChoice({ theme, mode }: ThemeChoice): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.mode = mode;
  const paper = getComputedStyle(root).getPropertyValue("--color-paper").trim();
  if (paper) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", paper);
}

export function storeThemeChoice({ theme, mode }: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice just lasts for this visit.
  }
}
