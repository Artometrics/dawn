export type ArticleStatus = 'draft' | 'published';

export type ArticleRecord = {
  id: string;
  title: string;
  slug: string;
  subject: string;
  dek: string;
  body: string;
  recipeId: string | null;
  status: ArticleStatus;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';

export type SubscriberRecord = {
  id: string;
  email: string;
  status: SubscriberStatus;
  consentAt: number | null;
  createdAt: number;
  confirmToken: string;
  unsubToken: string;
};

export type SendRecord = {
  id: string;
  articleId: string;
  sentAt: number;
  recipients: number;
  opens: number;
  clicks: number;
  openedIds: string[];
  clickedIds: string[];
  /** True when the send was filed and nobody was mailed. */
  dryRun?: boolean;
};

export type OutboxMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  articleId: string;
  headers?: Record<string, string>;
};

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  articleId?: string;
  headers?: Record<string, string>;
};

/** Confirmed readers mailed in one pass. Extra addresses stay for a later send. */
export const SEND_BATCH_CAP = 50;

/**
 * Real mail is off unless this is the exact string "true".
 * A Resend, Postmark, or SES key does not turn it on by itself.
 */
export function mailSendingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEWSLETTER_SEND_ENABLED === 'true';
}

export interface EmailProvider {
  readonly id: 'console' | 'resend' | 'postmark' | 'ses';
  send(message: MailMessage): Promise<{ id?: string }>;
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return slug || 'letter';
}

export function parseSubscriberCsv(csv: string): { emails: string[]; rejected: number } {
  const emails: string[] = [];
  let rejected = 0;
  for (const line of csv.split(/\r?\n/)) {
    const cell = line.split(',')[0]?.trim().replace(/^"|"$/g, '').toLowerCase() ?? '';
    if (!cell || cell === 'email') continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell)) {
      rejected += 1;
      continue;
    }
    emails.push(cell);
  }
  return { emails: [...new Set(emails)], rejected };
}

export function subscribersToCsv(rows: SubscriberRecord[]): string {
  const lines = ['email,status,consent_at'];
  for (const row of rows) {
    lines.push(`${row.email},${row.status},${row.consentAt ?? ''}`);
  }
  return `${lines.join('\n')}\n`;
}

export function renderLetterHtml(article: ArticleRecord, extra = ''): string {
  const body = markdownToHtml(article.body);
  return `<!doctype html><html><body style="margin:0;background:#07080f;color:#f4f6fb;font-family:Georgia,serif">
  <article style="max-width:68ch;margin:0 auto;padding:32px 20px">
    <p style="letter-spacing:.14em;text-transform:uppercase;font-family:sans-serif;font-size:12px;color:#9aa6c3">${escapeHtml(article.dek || 'A studio letter')}</p>
    <h1 style="font-weight:560;letter-spacing:-.03em">${escapeHtml(article.title)}</h1>
    ${body}
    ${extra}
  </article></body></html>`;
}

export function rewriteLinks(html: string, clickBase: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_match, url: string) => `href="${clickBase}${encodeURIComponent(url)}"`);
}

export function markdownToHtml(markdown: string): string {
  const blocks = markdown.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('### ')) return `<h3>${inline(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith('## ')) return `<h2>${inline(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith('# ')) return `<h2>${inline(trimmed.slice(2))}</h2>`;
      if (trimmed.split('\n').every((line) => line.startsWith('- '))) {
        return `<ul>${trimmed
          .split('\n')
          .map((line) => `<li>${inline(line.slice(2))}</li>`)
          .join('')}</ul>`;
      }
      return `<p>${inline(trimmed).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

function inline(text: string): string {
  const safe = escapeHtml(text);
  return safe
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function consoleEmailProvider(outbox: OutboxMail[]): EmailProvider {
  return {
    id: 'console',
    async send(message) {
      outbox.push({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        articleId: message.articleId || '',
        headers: message.headers,
      });
      return { id: `console-${outbox.length}` };
    },
  };
}

export function resendProvider(fetchImpl: typeof fetch, key: string, from: string): EmailProvider {
  return {
    id: 'resend',
    async send(message) {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: message.to, subject: message.subject, html: message.html, text: message.text, headers: message.headers }),
      });
      if (!response.ok) throw new Error(`Resend refused the message (${response.status}).`);
      const data = (await response.json()) as { id?: string };
      return { id: data.id };
    },
  };
}

export function postmarkProvider(fetchImpl: typeof fetch, key: string, from: string): EmailProvider {
  return {
    id: 'postmark',
    async send(message) {
      const response = await fetchImpl('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'X-Postmark-Server-Token': key, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          From: from,
          To: message.to,
          Subject: message.subject,
          HtmlBody: message.html,
          TextBody: message.text,
          Headers: Object.entries(message.headers || {}).map(([Name, Value]) => ({ Name, Value })),
        }),
      });
      if (!response.ok) throw new Error(`Postmark refused the message (${response.status}).`);
      const data = (await response.json()) as { MessageID?: string };
      return { id: data.MessageID };
    },
  };
}

/** SES v2 is selected when its env is present. Signing stays in the gateway, never in the page. */
export function sesProvider(fetchImpl: typeof fetch, region: string, accessKey: string, secret: string, from: string): EmailProvider {
  return {
    id: 'ses',
    async send(message) {
      const body = JSON.stringify({
        FromEmailAddress: from,
        Destination: { ToAddresses: [message.to] },
        Content: { Simple: { Subject: { Data: message.subject }, Body: { Html: { Data: message.html }, Text: { Data: message.text } } } },
      });
      const headers = await sesHeaders(region, body, accessKey, secret);
      const response = await fetchImpl(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
        method: 'POST',
        headers,
        body,
      });
      if (!response.ok) throw new Error(`SES refused the message (${response.status}).`);
      return { id: response.headers.get('x-amzn-requestid') ?? undefined };
    },
  };
}

async function sesHeaders(region: string, body: string, accessKey: string, secret: string): Promise<Record<string, string>> {
  const { createHash, createHmac } = await import('node:crypto');
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update(body).digest('hex');
  const host = `email.${region}.amazonaws.com`;
  const canonical = ['POST', '/v2/email/outbound-emails', '', 'content-type:application/json', `host:${host}`, `x-amz-date:${amzDate}`, '', 'content-type;host;x-amz-date', payloadHash].join('\n');
  const scope = `${day}/${region}/ses/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
  const kDate = createHmac('sha256', `AWS4${secret}`).update(day).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update('ses').digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  return {
    'content-type': 'application/json',
    host,
    'x-amz-date': amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`,
  };
}

export function emailProviderFromEnv(fetchImpl: typeof fetch, outbox: OutboxMail[]): EmailProvider {
  const from = process.env.DAWN_MAIL_FROM || 'Dawn <letters@localhost>';
  if (process.env.RESEND_API_KEY) return resendProvider(fetchImpl, process.env.RESEND_API_KEY, from);
  if (process.env.POSTMARK_SERVER_TOKEN) return postmarkProvider(fetchImpl, process.env.POSTMARK_SERVER_TOKEN, from);
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SES_REGION) {
    return sesProvider(fetchImpl, process.env.AWS_SES_REGION, process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, from);
  }
  return consoleEmailProvider(outbox);
}
