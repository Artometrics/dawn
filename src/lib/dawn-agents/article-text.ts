import { inspectUrl, isPrivateIp } from '../cuts/policy';
import { assertPublicHttpUrl } from './ssrf';

export class ArticleError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.name = 'ArticleError';
    this.status = status;
    this.code = code;
  }
}

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

/** Read a public article. Video hosts are refused before any fetch. DNS checks use assertPublicHttpUrl. */
export async function fetchArticleText(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<{ text: string; finalUrl: string }> {
  const inspected = inspectUrl(rawUrl);
  if (!inspected.ok) throw new ArticleError(400, inspected.error, inspected.code);
  if (!inspected.url) throw new ArticleError(400, 'Add an article URL.', 'BAD_INPUT');

  let current = inspected.url;
  for (let hop = 0; hop < 4; hop += 1) {
    const hopCheck = inspectUrl(current);
    if (!hopCheck.ok || !hopCheck.url) {
      throw new ArticleError(400, hopCheck.ok ? 'That redirect is empty.' : hopCheck.error, hopCheck.ok ? 'BAD_INPUT' : hopCheck.code);
    }
    let url: URL;
    try {
      url = await assertPublicHttpUrl(hopCheck.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That host is not a public article.';
      throw new ArticleError(400, message, 'BAD_INPUT');
    }
    if (isPrivateIp(url.hostname)) throw new ArticleError(400, 'That host is not a public article.', 'BAD_INPUT');
    const response = await fetchImpl(url.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
      headers: { 'user-agent': 'DawnCuts/1 (article extract)', accept: 'text/html, text/plain;q=0.9' },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new ArticleError(502, 'That article redirected without a destination.', 'UPSTREAM');
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) throw new ArticleError(502, `The article returned ${response.status}.`, 'UPSTREAM');
    const type = response.headers.get('content-type') || '';
    if (type && !/text\/|application\/json|application\/xhtml|application\/xml/i.test(type)) {
      throw new ArticleError(400, 'The desk reads article text, not a media file.', 'BAD_INPUT');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 1_000_000) throw new ArticleError(413, 'That article is too large to read.', 'BAD_INPUT');
    const text = htmlToText(new TextDecoder().decode(bytes)).slice(0, 20_000);
    if (text.length < 40) throw new ArticleError(422, 'That page did not have enough text to write from.', 'BAD_INPUT');
    return { text, finalUrl: url.toString() };
  }
  throw new ArticleError(502, 'That article redirected too many times.', 'UPSTREAM');
}
