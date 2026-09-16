import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);
  const [isSyncingUser, setIsSyncingUser] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!session) {
      setApiUser(null);
      setSyncError(null);
      return;
    }

    let isMounted = true;
    setIsSyncingUser(true);
    setSyncError(null);

    void getCurrentUser(session)
      .then((nextUser) => {
        if (isMounted) setApiUser(nextUser);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setSyncError(error instanceof Error ? error.message : "No se pudo sincronizar el usuario.");
        }
      })
      .finally(() => {
        if (isMounted) setIsSyncingUser(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

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
