import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Eyebrow } from "./eyebrow";
import { IconButton } from "./icon-button";

type ModalProps = {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
};

/** Native <dialog> modal: focus trap and Escape come from the browser. */
export function Modal({ title, eyebrow, onClose, children, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={cn(
        "m-auto max-h-[min(90vh,50rem)] w-[calc(100%-2rem)] overflow-auto rounded-2xl bg-surface p-0 text-ink shadow-lift backdrop:bg-black/50",
        size === "lg" ? "max-w-3xl" : "max-w-xl",
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="grid gap-5 p-5 sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
          </div>
          <IconButton label="Cerrar" tone="plain" onClick={onClose}>✕</IconButton>
        </header>
        {children}
      </div>
    </dialog>
  );
}
