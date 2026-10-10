import { Navigate } from "react-router-dom";
import { BrandMark } from "../components/brand-mark";
import { StatusPage } from "../components/status-page";
import { Alert, Button } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { useAsyncAction } from "../hooks/use-async-action";
import { AuthLayout } from "../layouts/auth-layout";

export function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const signIn = useAsyncAction();

  if (isLoading) return <StatusPage isLoading>Comprobando sesión...</StatusPage>;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <AuthLayout>
      <section className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-lift sm:p-8">
        <BrandMark />
        <div aria-hidden="true" className="mx-auto mt-11 mb-7 flex size-24 -rotate-6 items-center justify-center gap-3 rounded-[1.9rem] bg-teal-soft text-lg font-black text-teal-dark">
          <span>abc</span>
          <strong className="text-3xl text-coral">+</strong>
        </div>
        <h1 className="m-0 text-4xl leading-none font-bold tracking-tighter">Aprende palabras en contexto.</h1>
        <p className="mt-3.5 mb-6 leading-normal text-muted">Inicia sesión para continuar con tu aprendizaje.</p>
        <Button size="lg" isLoading={signIn.isPending} loadingLabel="Redirigiendo..." onClick={() => void signIn.run(signInWithGoogle, "No se pudo iniciar sesión.")}>
          Continuar con Google
        </Button>
        {signIn.error ? <Alert className="mt-4 text-left">{signIn.error}</Alert> : null}
      </section>
    </AuthLayout>
  );
}
