import { useState, type ReactNode } from "react";
import { Button } from "./button";

type ConfirmButtonProps = {
  children: ReactNode;
  /** Label of the second, destructive click. */
  confirmLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md";
};

/** Destructive action that needs a second click, so nothing is deleted by accident. */
export function ConfirmButton({ children, confirmLabel, onConfirm, isLoading = false, loadingLabel = "Eliminando...", disabled = false, size }: ConfirmButtonProps) {
  const [isArmed, setIsArmed] = useState(false);

  if (!isArmed) {
    return <Button variant="ghost" size={size} disabled={disabled} className="text-danger hover:bg-danger-soft" onClick={() => setIsArmed(true)}>{children}</Button>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Button variant="danger" size={size} disabled={disabled} isLoading={isLoading} loadingLabel={loadingLabel} onClick={onConfirm}>{confirmLabel}</Button>
      <Button variant="ghost" size={size} disabled={isLoading} onClick={() => setIsArmed(false)}>Cancelar</Button>
    </span>
  );
}
