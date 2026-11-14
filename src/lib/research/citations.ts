import { collectionName } from './collections';

export type ShareCitation = {
  sourceTitle?: unknown;
  page?: unknown;
  timestamp?: unknown;
  excerpt?: unknown;
  collectionId?: unknown;
};

export type ShareAnswer = {
  question?: unknown;
  collectionId?: unknown;
  citations?: unknown;
};

export function toMarkdown(answers: ShareAnswer[], title: string, names?: { id: string; name: string }[]): string {
  const lines = [
    `# Research citations — ${clean(title) || 'Dawn'}`,
    '',
    'Excerpts from files on this desk. Account addresses and file locations are left out.',
    '',
  ];
  for (const answer of answers) {
    const question = clean(answer.question);
    if (!question) continue;
    lines.push(`## ${question}`, '');
    const citations = citationsOf(answer);
    if (!citations.length) {
      lines.push('No citation on this question.', '');
      continue;
    }
    for (const citation of citations) {
      const where = place(citation);
      const collection = collectionName(text(citation.collectionId) || text(answer.collectionId), names);
      lines.push(`- ${clean(citation.sourceTitle) || 'Untitled'} · ${where} · ${collection}`);
      const quote = clean(citation.excerpt);
      if (quote) lines.push('', `> ${quote}`, '');
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

export function toBibtex(answers: ShareAnswer[], names?: { id: string; name: string }[]): string {
  const entries: string[] = [];
  let index = 1;
  for (const answer of answers) {
    for (const citation of citationsOf(answer)) {
      const title = clean(citation.sourceTitle) || 'Untitled';
      const collection = collectionName(text(citation.collectionId) || text(answer.collectionId), names);
      const page = numberOrNull(citation.page);
      const timestamp = text(citation.timestamp);
      const quote = clean(citation.excerpt);
      const key = `dawn-${slug(title)}-${page ? `p${page}` : timestamp ? slug(timestamp) : 'note'}-${index}`;
      const fields = [
        `  title = {${bib(title)}}`,
        `  booktitle = {${bib(collection)}}`,
        page ? `  pages = {${page}}` : '',
        '  howpublished = {Dawn}',
        `  note = {${bib([timestamp, quote].filter(Boolean).join('. '))}}`,
      ].filter(Boolean);
      entries.push(`@misc{${key},\n${fields.join(',\n')}\n}`);
      index += 1;
    }
  }
  return entries.length ? `${entries.join('\n\n')}\n` : '';
}

export function downloadText(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function citationsOf(answer: ShareAnswer): ShareCitation[] {
  if (!Array.isArray(answer.citations)) return [];
  return answer.citations.filter((item): item is ShareCitation => Boolean(item) && typeof item === 'object');
}

function place(citation: ShareCitation) {
  const timestamp = text(citation.timestamp);
  if (timestamp) return timestamp;
  const page = numberOrNull(citation.page);
  if (page) return `p. ${page}`;
  return 'note';
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function clean(value: unknown) {
  return text(value).replace(/\s+/g, ' ').trim();
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function bib(value: string) {
  return value.replace(/[\\{}]/g, (char) => `\\${char}`);
}

function slug(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleaned.slice(0, 40) || 'source';
}
