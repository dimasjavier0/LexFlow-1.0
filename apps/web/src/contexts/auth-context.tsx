import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AuthContextValue = { isAuthenticated: boolean; setAuthenticated: (value: boolean) => void };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const value = useMemo(() => ({ isAuthenticated, setAuthenticated }), [isAuthenticated]);
  return <AuthContext value={value}>{children}</AuthContext>;
}
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
