import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

export function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (isLoading) return <main className="auth-page">Comprobando sesión...</main>;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
      setIsSigningIn(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">LEXFLOW</p>
        <h1>Aprende palabras en contexto.</h1>
        <p className="auth-copy">Inicia sesión para continuar con tu aprendizaje.</p>
        <button className="primary-button" disabled={isSigningIn} onClick={() => void handleGoogleLogin()}>
          {isSigningIn ? "Redirigiendo..." : "Continuar con Google"}
        </button>
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
      </section>
    </main>
  );
}