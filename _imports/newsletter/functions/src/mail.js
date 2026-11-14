import { ADDRESS_LINES, FROM_ADDRESS, REPLY_TO, apiBase, publicBase } from './config.js';
import { markdownToText, renderMarkdown } from './markdown.js';
import { GEMINI_API_KEY, RESEND_API_KEY, readSecret, transportMode } from './secrets.js';
import { FieldValue, db } from './store.js';

function escape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLetterHtml({
  title,
  dek,
  bodyHtml,
  preheader,
  unsubscribeUrl,
  openPixelUrl,
}) {
  const address = ADDRESS_LINES.map((line) => escape(line)).join('<br />');
  const pixel = openPixelUrl
    ? `<img src="${escape(openPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : '';
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;color:#10141c;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f5f7;">${escape(preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
    <tr><td style="padding:28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
        <tr><td style="padding:0 8px 18px;font-family:Georgia,'Iowan Old Style',serif;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#0047FF;">Artometrics</div>
          <div style="height:3px;background:#0047FF;margin:12px 0 22px;"></div>
          <h1 style="margin:0;font-weight:500;font-size:36px;line-height:1.05;letter-spacing:-0.03em;">${escape(title)}</h1>
          ${dek ? `<p style="margin:16px 0 0;font-size:18px;line-height:1.45;font-style:italic;color:#243044;">${escape(dek)}</p>` : ''}
        </td></tr>
        <tr><td style="background:#0047FF;height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:8px 8px 0;font-family:Georgia,'Iowan Old Style',serif;font-size:18px;line-height:1.55;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:28px 8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#243044;">
          <p style="margin:0 0 12px;">${address}</p>
          <p style="margin:0;">You can leave this list in one click. <a href="${escape(unsubscribeUrl)}" style="color:#0033cc;">Unsubscribe</a>.</p>
          <p style="margin:8px 0 0;">The street address above is a placeholder until Artometrics files the real one.</p>
        </td></tr>
      </table>
      ${pixel}
    </td></tr>
  </table>
</body>
</html>`;
}

export function letterText({ title, dek, bodyMarkdown, unsubscribeUrl }) {
  return [
    title,
    dek || '',
    '',
    markdownToText(bodyMarkdown),
    '',
    ADDRESS_LINES.join('\n'),
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
    'The street address is a placeholder until Artometrics files the real one.',
  ]
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n');
}

export function rewriteLinks(html, clickBase) {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_full, url) => {
    return `href="${clickBase}?u=${encodeURIComponent(url)}"`;
  });
}

export async function deliver({ to, subject, html, text, headers, kind, issueId }) {
  const mode = transportMode();
  if (mode === 'dry-run') {
    await db.collection('dryRuns').add({
      to,
      subject,
      html,
      text,
      headers: headers || {},
      kind,
      issueId: issueId || null,
      transport: 'dry-run',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { transport: 'dry-run' };
  }
  if (process.env.NEWSLETTER_DRY_RUN === '1' || process.env.FUNCTIONS_EMULATOR === 'true') {
    throw new Error('Refusing to call Resend from a dry-run process.');
  }
  const key = readSecret(RESEND_API_KEY, 'RESEND_API_KEY');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
      text,
      reply_to: REPLY_TO,
      headers,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend returned ${response.status}: ${detail.slice(0, 240)}`);
  }
  return { transport: 'resend' };
}

export async function deliverBatch(messages) {
  const mode = transportMode();
  if (mode === 'dry-run') {
    for (const message of messages) {
      await db.collection('dryRuns').add({
        ...message,
        headers: message.headers || {},
        issueId: message.issueId || null,
        transport: 'dry-run',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return { transport: 'dry-run' };
  }
  if (process.env.NEWSLETTER_DRY_RUN === '1' || process.env.FUNCTIONS_EMULATOR === 'true') {
    throw new Error('Refusing to call Resend from a dry-run process.');
  }
  const key = readSecret(RESEND_API_KEY, 'RESEND_API_KEY');
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      messages.map((message) => ({
        from: FROM_ADDRESS,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: REPLY_TO,
        headers: message.headers,
      })),
    ),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend returned ${response.status}: ${detail.slice(0, 240)}`);
  }
  return { transport: 'resend' };
}

export function confirmHtml({ confirmUrl, unsubscribeUrl }) {
  return renderLetterHtml({
    title: 'Confirm the letter',
    dek: 'One click, and the next letter can find you.',
    preheader: 'Confirm your Artometrics subscription.',
    bodyHtml: `<p><a href="${escape(confirmUrl)}" style="color:#0033cc;">Confirm this address</a></p><p>If you did not ask for this, ignore the note. Nothing is added until you confirm.</p>`,
    unsubscribeUrl,
  });
}

export function openPixelUrl(token) {
  return `${apiBase()}/track/open/${token}`;
}

export function clickBase(token) {
  return `${apiBase()}/track/click/${token}`;
}

export function unsubscribeUrl(token) {
  return `${apiBase()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function humanUnsubscribeUrl(token) {
  return `${publicBase()}/unsubscribed?token=${encodeURIComponent(token)}`;
}

export { GEMINI_API_KEY, renderMarkdown };
