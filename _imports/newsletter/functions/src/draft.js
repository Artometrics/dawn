import { HttpError } from './http.js';
import { markdownToText, slugify } from './markdown.js';
import { GEMINI_API_KEY, geminiEnabled, readSecret } from './secrets.js';
import { fetchPublicText } from './ssrf.js';

export function fallbackDraft({ notes, pageText, url }) {
  const source = String(notes || pageText || '').trim();
  const first =
    source
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) || 'Notes from the desk';
  const title = first.replace(/^#+\s*/, '').slice(0, 120);
  return {
    title,
    subject: title.slice(0, 240),
    preheader: title.slice(0, 140),
    dek: 'Drafted on the desk without a model.',
    bodyMarkdown: source || `No notes were pasted.${url ? ` Source: ${url}` : ''}`,
    generator: 'local-fallback',
  };
}

function clampDraft(raw, generator) {
  const title = String(raw.title || 'Untitled letter').trim().slice(0, 180);
  const body = String(raw.bodyMarkdown || raw.body || '').trim().slice(0, 100000);
  return {
    title,
    subject: String(raw.subject || title).trim().slice(0, 240),
    preheader: String(raw.preheader || '').trim().slice(0, 240),
    dek: String(raw.dek || '').trim().slice(0, 400),
    bodyMarkdown: body,
    slug: slugify(raw.slug || title),
    generator,
  };
}

export async function draftIssue({ notes, url }) {
  const trimmedNotes = String(notes || '').trim();
  const trimmedUrl = String(url || '').trim();
  if (!trimmedNotes && !trimmedUrl) {
    throw new HttpError(400, 'Paste notes or a link to draft from.', 'draft_empty');
  }
  let pageText = '';
  if (trimmedUrl) pageText = await fetchPublicText(trimmedUrl);
  if (!geminiEnabled()) {
    return fallbackDraft({ notes: trimmedNotes, pageText, url: trimmedUrl });
  }
  const key = readSecret(GEMINI_API_KEY, 'GEMINI_API_KEY');
  const prompt = [
    'You are the editor of Artometrics, a studio letter.',
    'Turn the source into one newsletter issue.',
    'Return JSON with keys title, subject, preheader, dek, bodyMarkdown.',
    'bodyMarkdown may use paragraphs, ## headings, lists, links, and blockquotes.',
    'Voice: concrete, calm, specific. No hype, no emoji, no invented quotes.',
    trimmedNotes ? `Notes:\n${trimmedNotes.slice(0, 12000)}` : '',
    pageText ? `Page text:\n${pageText}` : '',
    trimmedUrl ? `Source URL: ${trimmedUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    },
  );
  if (!response.ok) {
    return {
      ...fallbackDraft({ notes: trimmedNotes, pageText, url: trimmedUrl }),
      generator: 'local-fallback',
      warning: `Gemini returned ${response.status}. A local draft was used instead.`,
    };
  }
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  try {
    const parsed = JSON.parse(text);
    const draft = clampDraft(parsed, 'gemini-2.5-flash');
    if (!draft.bodyMarkdown) draft.bodyMarkdown = markdownToText(trimmedNotes || pageText);
    return draft;
  } catch {
    return {
      ...fallbackDraft({ notes: trimmedNotes, pageText, url: trimmedUrl }),
      warning: 'Gemini did not return JSON. A local draft was used instead.',
    };
  }
}
