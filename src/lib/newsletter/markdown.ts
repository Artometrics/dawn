/** Small markdown for the letter. HTML is escaped before any markup is added. */

export function renderMarkdown(markdown: string): string {
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
    .filter(Boolean)
    .join('\n');
}

export function markdownToText(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
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

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return slug || 'letter';
}
