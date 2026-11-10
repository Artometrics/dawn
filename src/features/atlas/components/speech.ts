'use client';

/** The device's own speech. No network, no key, and nothing is recorded. */
export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /en-US/.test(v.lang) && /Samantha|Google US|Aria|Jenny/.test(v.name)) ??
    voices.find((v) => /^en/.test(v.lang)) ??
    null
  );
}

export function hush() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

/** Speaks each line in order. `onEnd` runs when the last one finishes; it does not run if cancelled. */
export function speak(lines: string[], onEnd: () => void): () => void {
  if (!speechAvailable()) return () => {};
  hush();
  let live = true;
  const next = (index: number) => {
    if (!live) return;
    if (index >= lines.length) {
      onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(lines[index]);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-US';
    utterance.onend = () => next(index + 1);
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      if (live) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  };
  next(0);
  return () => {
    live = false;
    hush();
  };
}
