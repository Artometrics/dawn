import { scrubText } from './scrub';

/** Secrets first, then obvious emails and phone numbers. Reader ids are not PII. */
export function scrubPii(text: string, secrets: string[] = []): string {
  return scrubText(text, secrets)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[phone]');
}
