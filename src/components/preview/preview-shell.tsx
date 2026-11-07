import Link from 'next/link';
import './preview.css';

const LINKS = [
  { href: '/preview/village', label: 'Village' },
  { href: '/preview/bench', label: 'Bench' },
  { href: '/preview/habits', label: 'Habits' },
  { href: '/preview/stuck', label: 'Stuck' },
];

export function PreviewShell({
  title,
  lead,
  current,
  children,
}: {
  title: string;
  lead: string;
  current?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dawn-preview">
      <a className="pv-skip" href="#preview-main">Skip to the sample</a>
      <header className="pv-bar">
        <Link className="pv-word" href="/preview">Dawn</Link>
        <p className="pv-status">Demonstration. Agents are off. These rows are samples, not a live run.</p>
        <nav className="pv-nav" aria-label="Review pages">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current === link.href ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="preview-main" className="pv-main">
        <h1>{title}</h1>
        <p className="pv-lead">{lead}</p>
        {children}
      </main>
    </div>
  );
}
