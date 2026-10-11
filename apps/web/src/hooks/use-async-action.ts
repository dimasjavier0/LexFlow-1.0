import { useCallback, useState } from "react";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Tracks pending/error state for one async operation. `run` resolves to whether it succeeded. */
export function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>, fallback: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(errorMessage(caught, fallback));
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { run, isPending, error, clearError };
}
