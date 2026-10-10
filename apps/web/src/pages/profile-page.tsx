import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { StatusPage } from "../components/status-page";
import { Alert, Button, buttonClasses, Eyebrow, Field, Input } from "../components/ui";
import { useAuth } from "../contexts/auth-context";
import { errorMessage, useAsyncAction } from "../hooks/use-async-action";
import { AppLayout } from "../layouts/app-layout";
import { getDashboard, updateProfile, type Dashboard } from "../lib/api";
import { cn } from "../lib/cn";

function Stat({ label, value, hint, className }: { label: string; value: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("grid content-start gap-1 rounded-2xl border border-line bg-surface p-4 shadow-card", className)}>
      <dt className="text-[0.7rem] font-extrabold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="m-0 text-3xl font-black tracking-tight">{value}</dd>
      {hint ? <p className="m-0 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function days(count: number): string {
  return `${count} ${count === 1 ? "día" : "días"}`;
}

export function ProfilePage() {
  const { session } = useAuth();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const save = useAsyncAction();

  useEffect(() => {
    const current = sessionRef.current;
    if (!current) return;
    let isCurrent = true;
    setLoadError(null);
    getDashboard(current)
      .then((loaded) => {
        if (!isCurrent) return;
        setDashboard(loaded);
        setName(loaded.user.name ?? "");
        setAvatarUrl(loaded.user.avatarUrl ?? "");
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(errorMessage(error, "No se pudo cargar tu progreso."));
      });
    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  if (loadError) return <StatusPage action={<Button onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>}>{loadError}</StatusPage>;
  if (!dashboard) return <StatusPage isLoading>Cargando tu progreso...</StatusPage>;

  const { user, words, review } = dashboard;
  const displayName = user.name ?? user.email.split("@")[0];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setIsSaved(false);
    const saved = await save.run(async () => {
      const updated = await updateProfile(session, { name: name.trim() || null, avatarUrl: avatarUrl.trim() || null });
      setDashboard((current) => (current ? { ...current, user: updated } : current));
    }, "No se pudo guardar tu perfil.");
    setIsSaved(saved);
  };

  return (
    <AppLayout>
      <header className="mt-12 mb-8 flex flex-wrap items-center gap-5">
        {user.avatarUrl ? (
          <img className="size-20 rounded-3xl bg-teal-soft object-cover" src={user.avatarUrl} alt="" />
        ) : (
          <span aria-hidden="true" className="grid size-20 place-items-center rounded-3xl bg-teal-soft text-4xl font-black text-teal-dark">{displayName.slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <Eyebrow>Mi progreso</Eyebrow>
          <h1 className="mt-1 mb-0 truncate text-4xl font-bold tracking-tighter sm:text-5xl">{displayName}</h1>
          <p className="mt-1 mb-0 text-sm text-muted">{user.email}</p>
        </div>
        {review.due ? <Link className={buttonClasses()} to="/review">Repasar {review.due} {review.due === 1 ? "palabra" : "palabras"}</Link> : null}
      </header>

      <dl className="m-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-2 rounded-2xl border border-teal bg-teal-soft p-4 shadow-card">
          <dt className="text-[0.7rem] font-extrabold tracking-wide text-teal-dark uppercase">Nivel</dt>
          <dd className="m-0 text-3xl font-black tracking-tight text-teal-dark">{user.level}</dd>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label="Avance hacia el siguiente nivel" aria-valuemin={0} aria-valuemax={user.pointsForLevel} aria-valuenow={user.pointsIntoLevel}>
            <span className="block h-full rounded-full bg-teal" style={{ width: `${(user.pointsIntoLevel / user.pointsForLevel) * 100}%` }} />
          </div>
          <p className="m-0 text-xs text-teal-dark">Faltan {user.pointsForLevel - user.pointsIntoLevel} puntos para el nivel {user.level + 1}</p>
        </div>
        <Stat label="Puntos" value={user.pointsTotal} hint="Se ganan acertando repasos." />
        <Stat label="Racha actual" value={days(user.streakCurrent)} hint={user.streakCurrent ? "Repasa hoy para mantenerla." : "Haz un repaso para empezar una racha."} />
        <Stat label="Mejor racha" value={days(user.streakBest)} />
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="vocabulary-heading">
          <h2 id="vocabulary-heading" className="mb-3 text-xl font-bold tracking-tight">Tu vocabulario</h2>
          <dl className="m-0 grid grid-cols-3 gap-3">
            <Stat label="Quiero aprender" value={words.wantToLearn} className="bg-sun-soft" />
            <Stat label="Aprendidas" value={words.learned} />
            <Stat label="No me interesan" value={words.notInterested} />
          </dl>
        </section>
        <section aria-labelledby="review-heading">
          <h2 id="review-heading" className="mb-3 text-xl font-bold tracking-tight">Repaso espaciado</h2>
          <dl className="m-0 grid grid-cols-3 gap-3">
            <Stat label="Nuevas" value={review.new} />
            <Stat label="Aprendiendo" value={review.learning} />
            <Stat label="Dominadas" value={review.mastered} />
          </dl>
          <p className="mt-3 mb-0 text-xs text-muted">Las palabras que marcas como «Quiero aprender» vuelven en intervalos cada vez más largos. Cuatro aciertos seguidos y pasan a dominadas.</p>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="mb-4 text-xl font-bold tracking-tight">Tu perfil</h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
          <Field label="Nombre">
            <Input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder={user.email.split("@")[0]} />
          </Field>
          <Field label="Avatar" hint="Opcional. Dirección de una imagen.">
            <Input type="url" maxLength={500} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" isLoading={save.isPending} loadingLabel="Guardando...">Guardar perfil</Button>
            {isSaved ? <span className="text-sm font-semibold text-teal-dark" role="status">Perfil guardado.</span> : null}
          </div>
          {save.error ? <Alert className="sm:col-span-2">{save.error}</Alert> : null}
        </form>
      </section>
    </AppLayout>
  );
}
