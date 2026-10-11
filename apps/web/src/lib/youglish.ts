/** Loader and types for YouGlish's embeddable widget (https://youglish.com/api/doc/js-api). */

export type YouglishWidget = {
  fetch(query: string, language: string, accent?: string): void;
  next(): void;
  previous(): void;
  pause(): void;
};

type YouglishOptions = {
  /** Sum of component ids; 8 is the caption panel. */
  components: number;
  autoStart: 0 | 1;
  events: {
    onFetchDone?: (event: { totalResult: number }) => void;
    onVideoChange?: (event: { trackNumber: number }) => void;
    onError?: (event: { code: number }) => void;
  };
};

type YouglishApi = { Widget: new (targetId: string, options: YouglishOptions) => YouglishWidget };

declare global {
  interface Window {
    YG?: YouglishApi;
    onYouglishAPIReady?: () => void;
  }
}

const SCRIPT_URL = "https://youglish.com/public/emb/widget.js";

let loading: Promise<YouglishApi> | null = null;

/** Loads the widget script once; later calls share it. A failed load can be retried. */
export function loadYouglish(): Promise<YouglishApi> {
  if (window.YG?.Widget) return Promise.resolve(window.YG);
  loading ??= new Promise<YouglishApi>((resolve, reject) => {
    const fail = () => {
      loading = null;
      reject(new Error("No se pudo cargar YouGlish."));
    };
    // The script calls this global once it has run.
    window.onYouglishAPIReady = () => (window.YG?.Widget ? resolve(window.YG) : fail());
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => {
      script.remove();
      fail();
    };
    document.head.append(script);
  });
  return loading;
}
