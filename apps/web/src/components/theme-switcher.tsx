import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { applyThemeChoice, readThemeChoice, storeThemeChoice, THEMES, type ThemeChoice, type ThemeMode } from "../lib/theme";
import { IconButton } from "./ui";

const MODES: ReadonlyArray<{ id: ThemeMode; label: string; icon: string }> = [
  { id: "light", label: "Claro", icon: "☀" },
  { id: "dark", label: "Oscuro", icon: "☾" },
];

/** Button that opens the tone and light/dark picker. The choice is remembered on this device. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const choose = (next: ThemeChoice) => {
    setChoice(next);
    applyThemeChoice(next);
    storeThemeChoice(next);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <IconButton label="Cambiar tema" aria-expanded={isOpen} aria-haspopup="true" onClick={() => setIsOpen((open) => !open)}>
        <span aria-hidden="true" className="size-4 rounded-full bg-[conic-gradient(var(--color-teal)_0_50%,var(--color-coral)_50%_75%,var(--color-sun)_75%)]" />
      </IconButton>
      {isOpen ? (
        <div className="absolute top-full right-0 z-30 mt-2 grid w-60 gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-lift">
          <div role="group" aria-label="Modo" className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={choice.mode === mode.id}
                onClick={() => choose({ ...choice, mode: mode.id })}
                className={cn(
                  "cursor-pointer rounded-lg px-2 py-1.5 text-xs font-extrabold transition-colors",
                  choice.mode === mode.id ? "bg-surface text-teal-dark shadow-card" : "text-muted hover:text-teal-dark",
                )}
              >
                <span aria-hidden="true" className="mr-1.5">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Tonalidad" className="grid gap-1.5">
            <strong className="text-[0.7rem] font-extrabold tracking-wide text-muted uppercase">Tonalidad</strong>
            <div className="flex justify-between">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  aria-label={theme.label}
                  title={theme.label}
                  aria-pressed={choice.theme === theme.id}
                  onClick={() => choose({ ...choice, theme: theme.id })}
                  className={cn(
                    "size-8 cursor-pointer rounded-full border-2 border-surface transition-transform hover:scale-110",
                    choice.theme === theme.id && "ring-2 ring-ink",
                  )}
                  style={{ backgroundColor: theme.swatch }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
