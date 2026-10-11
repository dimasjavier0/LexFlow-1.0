import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/auth-context";
import { errorMessage } from "../../hooks/use-async-action";
import { listCollections, listWords, type AdminCollection, type AdminWord } from "../../lib/admin-api";

/** Collections plus the lazily loaded word list of each one. */
export function useAdminLibrary() {
  const { session, user } = useAuth();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const userId = user?.id ?? null;

  const [collections, setCollections] = useState<AdminCollection[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // A missing key means "not fetched yet", which is different from an empty collection.
  const [wordsByCollection, setWordsByCollection] = useState<Record<string, AdminWord[]>>({});

  const reloadCollections = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      setCollections(await listCollections(current));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error, "No se pudieron cargar las colecciones."));
    }
  }, []);

  useEffect(() => {
    if (userId) void reloadCollections();
  }, [reloadCollections, userId]);

  /** Fetches (or refetches) the words of a collection. Throws on failure. */
  const loadWords = useCallback(async (collectionId: string) => {
    const current = sessionRef.current;
    if (!current) return;
    const words = await listWords(current, collectionId);
    setWordsByCollection((previous) => ({ ...previous, [collectionId]: words }));
  }, []);

  /**
   * Adds or replaces words in a collection's list. Collections that were never
   * fetched are left alone so opening them later still loads the full list.
   */
  const upsertWords = useCallback((collectionId: string, words: AdminWord[]) => {
    setWordsByCollection((previous) => {
      const existing = previous[collectionId];
      if (!existing) return previous;
      const incoming = new Map(words.map((word) => [word.id, word]));
      const merged = existing.map((word) => incoming.get(word.id) ?? word);
      const known = new Set(existing.map((word) => word.id));
      return { ...previous, [collectionId]: [...merged, ...words.filter((word) => !known.has(word.id))] };
    });
  }, []);

  const removeWord = useCallback((collectionId: string, wordId: string) => {
    setWordsByCollection((previous) => {
      const existing = previous[collectionId];
      return existing ? { ...previous, [collectionId]: existing.filter((word) => word.id !== wordId) } : previous;
    });
  }, []);

  const patchCollection = useCallback((collectionId: string, patch: Partial<AdminCollection>) => {
    setCollections((previous) => previous?.map((collection) => (collection.id === collectionId ? { ...collection, ...patch } : collection)) ?? previous);
  }, []);

  return { session, collections, loadError, wordsByCollection, reloadCollections, loadWords, upsertWords, removeWord, patchCollection };
}

export type AdminLibrary = ReturnType<typeof useAdminLibrary>;
