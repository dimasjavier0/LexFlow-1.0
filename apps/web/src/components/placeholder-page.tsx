export function PlaceholderPage({ title }: { title: string }) {
  return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6"><section><p className="text-sm font-medium tracking-wide text-cyan-700">LEXFLOW</p><h1 className="mt-2 text-4xl font-bold text-slate-950">{title}</h1><p className="mt-4 text-slate-600">La experiencia de aprendizaje se construirá aquí.</p></section></main>;
}
