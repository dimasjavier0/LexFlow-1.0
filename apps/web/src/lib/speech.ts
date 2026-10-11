/** Browser text-to-speech, used when a word has no recording. Nothing is generated or stored on the server. */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Reads `text` aloud in English, replacing anything already being spoken. */
export function speak(text: string, accent: "US" | "UK" = "US"): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = accent === "UK" ? "en-GB" : "en-US";
  utterance.lang = lang;
  // Voices load lazily; without a match the browser picks one from `lang`.
  const voice = synth.getVoices().find((item) => item.lang.replace("_", "-") === lang);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  synth.speak(utterance);
}
