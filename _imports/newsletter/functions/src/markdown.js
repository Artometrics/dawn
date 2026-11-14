function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(value) {
  let out = escapeHtml(value);
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

export function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  const para = [];
  const flushPara = () => {
    if (!para.length) return;
    html.push(`<p>${inline(para.join(' '))}</p>`);
    para.length = 0;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flushPara();
      i += 1;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      html.push('<hr />');
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushPara();
      const level = heading[1].length + 1;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      flushPara();
      const quote = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    para.push(line.trim());
    i += 1;
  }
  flushPara();
  return html.join('\n');
}

export function markdownToText(src) {
  return String(src || '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

export function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'letter';
}
