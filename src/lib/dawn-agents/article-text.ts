import { inspectUrl } from '../cuts/policy';
import { assertPublicHttpUrl } from './ssrf';

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fetch article text. Video hosts are refused before any request. SSRF checks use assertPublicHttpUrl. */
export async function fetchArticleText(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<{ text: string; finalUrl: string }> {
  const inspected = inspectUrl(rawUrl);
  if (!inspected.ok) throw new Error(inspected.error);
  if (!inspected.url) throw new Error('Add an article URL.');

  let current = inspected.url;
  for (let hop = 0; hop < 4; hop += 1) {
    const hopCheck = inspectUrl(current);
    if (!hopCheck.ok || !hopCheck.url) throw new Error(hopCheck.ok ? 'That redirect is empty.' : hopCheck.error);
    await assertPublicHttpUrl(hopCheck.url);
    const response = await fetchImpl(hopCheck.url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
      headers: {
        'user-agent': 'DawnCuts/1 (article extract)',
        accept: 'text/html, text/plain;q=0.9',
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('That article redirected without a destination.');
      current = new URL(location, hopCheck.url).toString();
      continue;
    }
    if (!response.ok) throw new Error(`The article returned ${response.status}.`);
    const type = response.headers.get('content-type') || '';
    if (type && !/text\/|application\/json|application\/xhtml|application\/xml/i.test(type)) {
      throw new Error('Cuts reads article text, not a media file.');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 1_000_000) throw new Error('That article is too large to read.');
    const html = new TextDecoder().decode(bytes);
    const text = htmlToText(html).slice(0, 20_000);
    if (text.length < 40) throw new Error('That page did not have enough text to write from.');
    return { text, finalUrl: hopCheck.url };
  }
  throw new Error('That article redirected too many times.');
}
