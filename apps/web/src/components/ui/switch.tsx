import { cn } from "../../lib/cn";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, e.g. "Publicar Colors". */
  label: string;
  onText: string;
  offText: string;
  disabled?: boolean;
};

export function Switch({ checked, onChange, label, onText, offText, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-[0.7rem] font-extrabold transition-colors disabled:cursor-wait disabled:opacity-60",
        checked ? "bg-teal-soft text-teal-dark" : "bg-line/70 text-muted",
      )}
    >
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-teal" : "bg-muted/40")}>
        <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-4")} />
      </span>
      {checked ? onText : offText}
    </button>
  );
}
