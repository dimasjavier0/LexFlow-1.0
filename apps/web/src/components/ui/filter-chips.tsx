import { cn } from "../../lib/cn";

type FilterChipsProps<T extends string> = {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <strong>{label}</strong>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1.5 text-[0.72rem] font-extrabold transition-colors",
            option.value === value ? "border-teal bg-teal-soft text-teal-dark" : "border-line bg-surface text-muted hover:border-teal hover:text-teal-dark",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
