import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      nodes.push(
        <a key={key} href={match[2]}>
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4]) {
      nodes.push(<code key={key}>{match[4]}</code>);
    }
    key += 1;
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(<pre key={key}>{code.join('\n')}</pre>);
      key += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(<h3 key={key}>{inline(line.slice(4))}</h3>);
      i += 1;
      key += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(<h2 key={key}>{inline(line.slice(3))}</h2>);
      i += 1;
      key += 1;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(<h2 key={key}>{inline(line.slice(2))}</h2>);
      i += 1;
      key += 1;
      continue;
    }
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={key}>
          {items.map((item) => (
            <li key={item}>{inline(item)}</li>
          ))}
        </ul>,
      );
      key += 1;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('- ') && !lines[i].startsWith('```')) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={key}>{inline(para.join(' '))}</p>);
    key += 1;
  }
  return <div className="credits-md">{blocks}</div>;
}
