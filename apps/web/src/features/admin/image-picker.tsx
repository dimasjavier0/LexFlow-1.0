import { useState, type KeyboardEvent } from "react";
import { Button, IconButton, Input } from "../../components/ui";
import { useAuth } from "../../contexts/auth-context";
import { useAsyncAction } from "../../hooks/use-async-action";
import { searchImages, type NewWordImage, type PixabayImage } from "../../lib/admin-api";

export type PickedImage = NewWordImage & { previewUrl: string };

type ImagePickerProps = {
  value: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  /** Search term used while the admin has not typed one, e.g. the word being created. */
  defaultQuery?: string;
  max?: number;
};

function fromPixabay(image: PixabayImage): PickedImage {
  return {
    url: image.url,
    previewUrl: image.previewUrl,
    source: "pixabay",
    attribution: `Pixabay: ${image.user}`,
    metadata: { id: image.id, pageUrl: image.pageUrl, tags: image.tags },
  };
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Runs `action` on Enter without submitting the surrounding form. */
function onEnter(action: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    action();
  };
}

/** Picks up to `max` images, from a Pixabay search or pasted URLs. */
export function ImagePicker({ value, onChange, defaultQuery = "", max = 4 }: ImagePickerProps) {
  const { session } = useAuth();
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const [results, setResults] = useState<PixabayImage[] | null>(null);
  const [page, setPage] = useState(1);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const search = useAsyncAction();

  const query = (typedQuery ?? defaultQuery).trim();
  const isFull = value.length >= max;
  const selectedUrls = new Set(value.map((image) => image.url));

  const add = (image: PickedImage) => {
    if (selectedUrls.has(image.url)) return;
    // A single-image picker (e.g. a cover) replaces its selection instead of blocking.
    if (max === 1) onChange([image]);
    else if (!isFull) onChange([...value, image]);
  };

  const runSearch = (nextPage: number) => {
    if (!session || !query) return;
    void search.run(async () => {
      setResults(await searchImages(session, query, nextPage));
      setPage(nextPage);
    }, "No se pudieron buscar imágenes.");
  };

  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isHttpUrl(trimmed)) {
      setUrlError("Escribe una URL completa que empiece por http:// o https://");
      return;
    }
    add({ url: trimmed, previewUrl: trimmed, source: "manual" });
    setUrl("");
    setUrlError(null);
  };

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-2 text-[0.82rem] font-semibold text-muted">
        <span>{max === 1 ? "Imagen" : "Imágenes"}</span>
        <span className="text-xs font-normal">{value.length}/{max}</span>
      </div>
      {value.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {value.map((image) => (
            <li key={image.url} className="relative">
              <img className="h-16 w-24 rounded-lg bg-teal-soft object-cover" src={image.previewUrl} alt="Imagen seleccionada" />
              <IconButton label="Quitar imagen" className="absolute -top-1.5 -right-1.5 size-6 bg-ink text-xs text-paper hover:bg-danger" tone="plain" onClick={() => onChange(value.filter((item) => item.url !== image.url))}>✕</IconButton>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input type="search" aria-label="Buscar imágenes en Pixabay" placeholder="Buscar en Pixabay" value={typedQuery ?? defaultQuery} onChange={(event) => setTypedQuery(event.target.value)} onKeyDown={onEnter(() => runSearch(1))} />
        <Button variant="secondary" className="shrink-0" disabled={!query} isLoading={search.isPending} loadingLabel="Buscando..." onClick={() => runSearch(1)}>Buscar</Button>
      </div>
      {search.error ? <p className="m-0 text-xs font-semibold text-danger" role="alert">{search.error}</p> : null}
      {results ? (
        <div className="flex items-center gap-2">
          <IconButton label="Imágenes anteriores" disabled={search.isPending || page === 1} onClick={() => runSearch(page - 1)}>←</IconButton>
          {results.length ? (
            <ul className="m-0 grid min-w-0 flex-1 list-none grid-cols-4 gap-2 p-0">
              {results.map((image) => {
                const isSelected = selectedUrls.has(image.url);
                return (
                  <li key={image.id}>
                    <button
                      type="button"
                      title={isSelected ? "Ya seleccionada" : `Seleccionar imagen de ${image.user}`}
                      disabled={isSelected || (isFull && max !== 1)}
                      onClick={() => add(fromPixabay(image))}
                      className="block w-full cursor-pointer overflow-hidden rounded-lg border-2 border-transparent transition hover:border-teal disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <img className="aspect-[4/3] w-full bg-teal-soft object-cover" src={image.previewUrl} alt={image.tags} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="m-0 flex-1 text-center text-xs text-muted">Sin resultados para “{query}”.</p>
          )}
          <IconButton label="Más imágenes" disabled={search.isPending || results.length === 0} onClick={() => runSearch(page + 1)}>→</IconButton>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input type="url" aria-label="URL de una imagen" placeholder="…o pega la URL de una imagen" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={onEnter(addUrl)} />
        <Button variant="secondary" className="shrink-0" disabled={!url.trim() || (isFull && max !== 1)} onClick={addUrl}>Añadir URL</Button>
      </div>
      {urlError ? <p className="m-0 text-xs font-semibold text-danger" role="alert">{urlError}</p> : null}
    </div>
  );
}
