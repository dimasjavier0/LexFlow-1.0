import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollection, type ApiCollection } from "../lib/api";

export function LearnPage() {
  const { collectionSlug = "" } = useParams();
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setWordIndex(0);
    setIsTranslationVisible(false);
    void getCollection(collectionSlug).then(setCollection).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la colección.");
    });
  }, [collectionSlug]);

  if (errorMessage) return <main className="auth-page"><p className="text-red-700">{errorMessage}</p></main>;
  if (!collection) return <main className="auth-page">Cargando colección...</main>;

  const currentWord = collection.words[wordIndex]?.word;
  if (!currentWord) return <main className="auth-page">Esta colección aún no tiene palabras.</main>;

  const moveWord = (direction: -1 | 1) => {
    setWordIndex((currentIndex) => (currentIndex + direction + collection.words.length) % collection.words.length);
    setIsTranslationVisible(false);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link className="text-sm font-medium text-cyan-700" to="/">← Colecciones</Link>
      <div className="mt-8 flex items-start justify-between gap-4">
        <div><p className="eyebrow">{collection.name}</p><h1 className="mt-2 text-4xl font-bold text-slate-950">{currentWord.term}</h1></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{currentWord.level}</span>
      </div>
      <section className="learning-panel mt-8">
        {currentWord.images[0] ? <img className="learning-image" src={currentWord.images[0].url} alt={currentWord.term} /> : <div className="image-placeholder">Imagen pendiente</div>}
        <div className="mt-6 flex items-center justify-between gap-4">
          <button className="secondary-button" onClick={() => moveWord(-1)}>←</button>
          <span className="text-sm text-slate-500">{wordIndex + 1} / {collection.words.length}</span>
          <button className="secondary-button" onClick={() => moveWord(1)}>→</button>
        </div>
        {currentWord.audios[0] ? <audio className="mt-6 w-full" controls src={currentWord.audios[0].url} /> : null}
        <p className="mt-6 text-center text-3xl font-semibold text-slate-950">{currentWord.term}</p>
        <button className="translation-button" onClick={() => setIsTranslationVisible((visible) => !visible)}>
          <span className={isTranslationVisible ? "" : "translation-hidden"}>{currentWord.translationEs}</span>
        </button>
        {currentWord.videos[0] ? <a className="mt-6 block text-center text-cyan-700" href={currentWord.videos[0].url} target="_blank" rel="noreferrer">Ver contexto en video</a> : null}
      </section>
    </main>
  );
}