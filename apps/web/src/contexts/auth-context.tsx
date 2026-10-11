import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getCurrentUser, type ApiUser } from "../lib/api";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  apiUser: ApiUser | null;
  isSyncingUser: boolean;
  syncError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};
type UserSync = { userId: string; apiUser: ApiUser | null; error: string | null };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sync, setSync] = useState<UserSync | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Keyed on the user id, not the session object: Supabase emits a new session on
  // every token refresh and tab focus, which must not re-run the role check.
  useEffect(() => {
    const currentSession = sessionRef.current;
    if (!userId || !currentSession) {
      setSync(null);
      return;
    }

    let isMounted = true;
    void getCurrentUser(currentSession)
      .then((apiUser) => {
        if (isMounted) setSync({ userId, apiUser, error: null });
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setSync({ userId, apiUser: null, error: error instanceof Error ? error.message : "No se pudo sincronizar el usuario." });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const currentSync = sync?.userId === userId ? sync : null;
  const apiUser = currentSync?.apiUser ?? null;
  const syncError = currentSync?.error ?? null;
  // Derived, so there is no render where a signed-in user looks "synced" without a role.
  const isSyncingUser = userId !== null && currentSync === null;

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(
    () => ({
      isAuthenticated: session !== null,
      isLoading,
      session,
      user: session?.user ?? null,
      apiUser,
      isSyncingUser,
      syncError,
      signInWithGoogle,
      signOut,
    }),
    [apiUser, isLoading, isSyncingUser, session, syncError],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
