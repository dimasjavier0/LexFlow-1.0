import { useEffect } from "react";
import { Alert, type AlertTone } from "./alert";
import { IconButton } from "./icon-button";

export type ToastMessage = { text: string; tone: AlertTone };

type ToastProps = { message: ToastMessage | null; onDismiss: () => void };

const AUTO_DISMISS_MS = 5000;

/** Floating feedback. Success messages dismiss themselves; errors stay until closed. */
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message || message.tone === "error") return;
    const timeout = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <Alert
        tone={message.tone}
        className="pointer-events-auto w-full max-w-md shadow-lift"
        action={<IconButton label="Cerrar aviso" tone="plain" className="size-7 text-current" onClick={onDismiss}>✕</IconButton>}
      >
        {message.text}
      </Alert>
    </div>
  );
}
