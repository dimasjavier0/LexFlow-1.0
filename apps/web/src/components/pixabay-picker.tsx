import { useState, type DragEvent } from "react";
import { useAuth } from "../contexts/auth-context";

const apiUrl = import.meta.env.VITE_API_URL;

export type PixabayImage = {
  id: number;
  previewUrl: string;
  url: string;
  pageUrl: string;
  tags: string;
  user: string;
};

type PixabayPickerProps = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  selectedImages: PixabayImage[];
  onSelectedImagesChange: (images: PixabayImage[]) => void;
  onFileSelected?: (file: File) => void;
};

export function PixabayPicker({ imageUrl, onImageUrlChange, selectedImages, onSelectedImagesChange, onFileSelected }: PixabayPickerProps) {
  const { session } = useAuth();
  const [images, setImages] = useState<PixabayImage[]>([]);
  const [page, setPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const search = async (nextPage = 1) => {
    if (!session || !imageUrl.trim()) return;
    setIsSearching(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/admin/pixabay/images?q=${encodeURIComponent(imageUrl.trim())}&page=${nextPage}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await response.json() as { images?: PixabayImage[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "No se pudieron buscar imágenes.");
      setImages(body.images ?? []);
      setPage(nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron buscar imágenes.");
    } finally {
      setIsSearching(false);
    }
  };

  const select = (image: PixabayImage) => {
    if (selectedImages.some((selected) => selected.id === image.id) || selectedImages.length >= 4) return;
    onSelectedImagesChange([...selectedImages, image]);
    setImages((current) => current.filter((option) => option.id !== image.id));
  };

  const remove = (image: PixabayImage) => {
    onSelectedImagesChange(selectedImages.filter((selected) => selected.id !== image.id));
    setImages((current) => current.some((option) => option.id === image.id) ? current : [image, ...current].slice(0, 4));
  };

  const addUrl = () => {
    if (!imageUrl.trim() || selectedImages.length >= 4 || selectedImages.some((image) => image.url === imageUrl.trim())) return;
    const url = imageUrl.trim();
    onSelectedImagesChange([...selectedImages, { id: Date.now(), previewUrl: url, url, pageUrl: url, tags: "Imagen añadida por URL", user: "manual" }]);
    onImageUrlChange(url);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith("image/") && onFileSelected) onFileSelected(file);
  };

  return <div className="pixabay-picker" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
    <div className="pixabay-search-row">
      <button type="button" className="pixabay-search-button" onClick={() => void search()} disabled={isSearching || !imageUrl.trim()} aria-label="Buscar imágenes en Pixabay">🔍 Buscar imágenes</button>
      <button type="button" className="pixabay-url-button" onClick={addUrl} disabled={!imageUrl.trim() || selectedImages.length >= 4}>＋ Agregar URL</button>
      <span className="pixabay-drop-hint">o arrastra una imagen aquí</span>
      {isSearching ? <small>Buscando...</small> : null}
      {message ? <small className="error-message">{message}</small> : null}
    </div>
    {(images.length || selectedImages.length) ? <>
      <div className="pixabay-row pixabay-selected-row">
        {selectedImages.map((image) => <button key={image.id} type="button" className="pixabay-image-button selected" onClick={() => remove(image)} title="Quitar imagen"><img src={image.previewUrl} alt={image.tags} /></button>)}
      </div>
      <div className="pixabay-row pixabay-options-row">
        <button type="button" className="pixabay-arrow" onClick={() => void search(Math.max(1, page - 1))} disabled={isSearching || page === 1} aria-label="Imágenes anteriores">←</button>
        {images.map((image) => <button key={image.id} type="button" className="pixabay-image-button" onClick={() => select(image)} title={`Seleccionar imagen de ${image.user}`}><img src={image.previewUrl} alt={image.tags} /></button>)}
        <button type="button" className="pixabay-arrow" onClick={() => void search(page + 1)} disabled={isSearching || images.length === 0} aria-label="Más imágenes">→</button>
      </div>
      <small className="pixabay-picker-count">Imágenes de Pixabay · seleccionadas: {selectedImages.length}/4</small>
    </> : null}
  </div>;
}
