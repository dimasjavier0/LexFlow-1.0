/** A study the progress page takes its figures from, linked so they can be checked. */
export function SourceLink({ source }: { source: { label: string; href: string } }) {
  return <a className="font-semibold text-teal-dark underline-offset-2 hover:underline" href={source.href} target="_blank" rel="noreferrer">{source.label}</a>;
}
