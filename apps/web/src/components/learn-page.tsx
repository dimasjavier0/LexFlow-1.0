import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollection, getProgress, type ApiCollection } from "../lib/api";
import { updateProgress, type LearningStatus } from "../lib/api";
import { useAuth } from "../contexts/auth-context";

export function LearnPage() {
  const { collectionSlug = "" } = useParams();
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const { session } = useAuth();

  useEffect(() => {
    setWordIndex(0);
    setIsTranslationVisible(false);
    setImageIndex(0);
    setVideoIndex(0);
    void getCollection(collectionSlug).then(setCollection).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la colección.");
    });
  }, [collectionSlug]);

  useEffect(() => {
    if (!session) return;
    void getProgress(session).then(setProgress).catch(() => undefined);
  }, [session]);

  if (errorMessage) return <main className="status-page"><p className="error-message">{errorMessage}</p></main>;
  if (!collection) return <main className="status-page"><span className="loading-mark" />Cargando colección...</main>;

  const currentWord = collection.words[wordIndex]?.word;
  if (!currentWord) return <main className="status-page">Esta colección aún no tiene palabras.</main>;

  const moveWord = (direction: -1 | 1) => {
    setWordIndex((currentIndex) => (currentIndex + direction + collection.words.length) % collection.words.length);
    setIsTranslationVisible(false);
    setImageIndex(0);
    setVideoIndex(0);
  };

  const moveImage = (direction: -1 | 1) => {
    setImageIndex((currentIndex) => (currentIndex + direction + currentWord.images.length) % currentWord.images.length);
  };

  const moveVideo = (direction: -1 | 1) => {
    setVideoIndex((currentIndex) => (currentIndex + direction + currentWord.videos.length) % currentWord.videos.length);
  };

  const saveProgress = async (status: LearningStatus) => {
    if (!session || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateProgress(session, currentWord.id, status);
      setProgress((current) => ({ ...current, [currentWord.id]: status }));
      moveWord(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar tu progreso.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="app-shell learn-shell">
      <header className="learn-topbar">
        <Link className="back-link" to="/" aria-label="Volver a colecciones">← <span>Volver</span></Link>
        <span className="learn-counter">{wordIndex + 1} / {collection.words.length}</span>
        <span className="level-pill">{currentWord.level}</span>
      </header>
      <div className="learning-heading"><p className="eyebrow">{collection.name}</p><h1>{currentWord.term}</h1><div className="learning-progress" aria-label={`Palabra ${wordIndex + 1} de ${collection.words.length}`}><span style={{ width: `${((wordIndex + 1) / collection.words.length) * 100}%` }} /></div></div>
      <section className="learning-panel">
        {currentWord.images.length ? <div className="media-carousel image-stage"><img className="learning-image" src={currentWord.images[imageIndex].url} alt={`${currentWord.term} ${imageIndex + 1}`} /><div className="carousel-controls"><button className="round-button" onClick={() => moveImage(-1)} aria-label="Imagen anterior">←</button><span>{imageIndex + 1} / {currentWord.images.length}</span><button className="round-button" onClick={() => moveImage(1)} aria-label="Imagen siguiente">→</button></div></div> : <div className="image-placeholder">Imagen pendiente</div>}
        <div className="word-tools"><button className="round-button" onClick={() => moveWord(-1)} aria-label="Palabra anterior">←</button><div>{currentWord.audios[0] ? <audio controls src={currentWord.audios[0].url} aria-label={`Pronunciación de ${currentWord.term}`} /> : <span className="audio-missing">Audio no disponible</span>}</div><button className="round-button" onClick={() => moveWord(1)} aria-label="Palabra siguiente">→</button></div>
        <button className="translation-button" onClick={() => setIsTranslationVisible((visible) => !visible)} aria-label="Mostrar u ocultar traducción"><span className={isTranslationVisible ? "" : "translation-hidden"}>{currentWord.translationEs}</span><small>{isTranslationVisible ? "Traducción" : "Toca para descubrir la traducción"}</small></button>
        {progress[currentWord.id] ? <p className="saved-status">Estado guardado: {progress[currentWord.id]}</p> : null}
        {currentWord.videos.length ? <div className="video-link"><a href={currentWord.videos[videoIndex].url} target="_blank" rel="noreferrer">Ver contexto en video {videoIndex + 1} ↗</a><div className="carousel-controls"><button className="round-button" onClick={() => moveVideo(-1)} aria-label="Video anterior">←</button><span>{videoIndex + 1} / {currentWord.videos.length}</span><button className="round-button" onClick={() => moveVideo(1)} aria-label="Video siguiente">→</button></div></div> : null}
        <div className="progress-actions"><button className="learn-action action-learn" disabled={isSaving} onClick={() => void saveProgress("WANT_TO_LEARN")}><span>+</span>Quiero aprender</button><button className="learn-action action-skip" disabled={isSaving} onClick={() => void saveProgress("NOT_INTERESTED")}>No me interesa</button><button className="learn-action action-done" disabled={isSaving} onClick={() => void saveProgress("LEARNED")}><span>✓</span>Ya la aprendí</button></div>
      </section>
    </main>
  );
}