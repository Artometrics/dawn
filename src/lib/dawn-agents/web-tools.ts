import { assertPublicHttpUrl } from './ssrf';

export type WebResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

async function readLimited(response: Response, max = 150_000): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (size >= max) {
      await reader.cancel();
      break;
    }
  }
  return text;
}

export async function webSearch(query: string, fetchImpl: typeof fetch = fetch): Promise<WebResult> {
  const q = query.trim().slice(0, 200);
  if (!q) return { ok: false, message: 'Missing search query.' };
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8_000), headers: { accept: 'application/json' } });
    if (!response.ok) return { ok: false, message: `Search failed (${response.status}).` };
    const data = (await response.json()) as {
      Heading?: string;
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: { Text?: string; FirstURL?: string; Topics?: { Text?: string; FirstURL?: string }[] }[];
    };
    const lines: string[] = [];
    if (data.Heading && data.AbstractText) {
      lines.push(`${data.Heading}: ${data.AbstractText}`);
      if (data.AbstractURL) lines.push(data.AbstractURL);
    }
    const topics = data.RelatedTopics ?? [];
    for (const topic of topics) {
      if (topic.Text) lines.push(topic.Text);
      for (const nested of topic.Topics ?? []) {
        if (nested.Text) lines.push(nested.Text);
      }
      if (lines.length >= 6) break;
    }
    if (!lines.length) return { ok: true, text: `No instant answer for “${q}”.` };
    return { ok: true, text: lines.slice(0, 6).join('\n').slice(0, 4000) };
  } catch {
    return { ok: false, message: 'Search did not respond.' };
  }
}

export async function webFetch(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<WebResult> {
  let current: URL;
  try {
    current = await assertPublicHttpUrl(rawUrl);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That URL is blocked.' };
  }
  try {
    for (let hop = 0; hop < 3; hop += 1) {
      const response = await fetchImpl(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8_000),
        headers: { accept: 'text/html, text/plain;q=0.9, */*;q=0.1' },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return { ok: false, message: 'The page redirected without a location.' };
        current = await assertPublicHttpUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) return { ok: false, message: `Fetch failed (${response.status}).` };
      const body = await readLimited(response);
      const type = response.headers.get('content-type') || '';
      const text = type.includes('html') ? htmlToText(body) : body.replace(/\s+/g, ' ').trim().slice(0, 4000);
      return { ok: true, text: text || 'The page was empty.' };
    }
    return { ok: false, message: 'Too many redirects.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Fetch failed.' };
  }
}
