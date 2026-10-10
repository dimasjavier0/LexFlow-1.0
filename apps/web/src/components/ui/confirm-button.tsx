import { useState, type ReactNode } from "react";
import { Button } from "./button";

type ConfirmButtonProps = {
  children: ReactNode;
  /** Label of the second, destructive click. */
  confirmLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

/** Destructive action that needs a second click, so nothing is deleted by accident. */
export function ConfirmButton({ children, confirmLabel, onConfirm, isLoading = false }: ConfirmButtonProps) {
  const [isArmed, setIsArmed] = useState(false);

  if (!isArmed) {
    return <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setIsArmed(true)}>{children}</Button>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Button variant="danger" isLoading={isLoading} loadingLabel="Eliminando..." onClick={onConfirm}>{confirmLabel}</Button>
      <Button variant="ghost" disabled={isLoading} onClick={() => setIsArmed(false)}>Cancelar</Button>
    </span>
  );
}
