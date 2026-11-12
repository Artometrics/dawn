'use client';

import { FileCode2, Moon, Terminal, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell } from '@/components/site/page-shell';
import { liveHref } from '@/lib/site/live';
import './code-hub.css';

const TOOLS = [
  { href: '/kits/nightcode', title: 'NightCode', line: 'Plan or build in a chat session.', icon: Moon },
  { href: '/kits/teammates', title: 'Teammates', line: 'A group chat that can hand the turn on.', icon: Users },
  { href: '/code/editor', title: 'Editor', line: 'Edit your desk files.', icon: FileCode2 },
  { href: '/kits', title: 'Kits', line: 'Small checks you can run.', icon: Terminal },
];

/** The Code hub. The full VS Code editor is one explicit, secondary button. */
export function CodeHub() {
  const [vscode, setVscode] = useState('/editor');
  useEffect(() => {
    // The static site has no editor, so its button opens the same path on the live origin.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
    setVscode(liveHref('/editor', location.origin) ?? '/editor');
  }, []);
  return (
    <PageShell title="Code" lead="Plan and build with a model, hand work between teammates, edit files, or open the full editor.">
      <ul className="ch-grid">
        {TOOLS.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <li key={tool.href} style={{ ['--i' as string]: index }}>
              <Link className="ch-card" href={tool.href}>
                <Icon aria-hidden />
                <span className="ch-title">{tool.title}</span>
                <span className="ch-line">{tool.line}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="dw-actions">
        <a className="dw-btn" href={vscode} data-open-vscode>Open VS Code</a>
      </p>
    </PageShell>
  );
}
