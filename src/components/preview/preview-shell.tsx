import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site/page-shell';
import './preview.css';

const LINKS = [
  { href: '/preview/village', label: 'Village' },
  { href: '/preview/bench', label: 'Bench' },
  { href: '/preview/habits', label: 'Habits' },
  { href: '/preview/stuck', label: 'Stuck' },
  { href: '/preview/style-guide', label: 'Style guide' },
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
    <div className="dw-page dawn-preview">
      <a className="dw-skip" href="#preview-main">Skip to the sample</a>
      <SiteHeader />
      <main id="preview-main" className="dw-main dw-main--wide">
        <div className="pv-sub">
          <span className="dw-badge dw-badge--accent">Demo, agents off</span>
          <nav className="pv-sub" aria-label="Review pages">
            <Link prefetch={false} className="dw-btn dw-btn--chip" href="/preview" aria-current={current === '/preview' ? 'page' : undefined}>All</Link>
            {LINKS.map((link) => (
              <Link prefetch={false} key={link.href} className="dw-btn dw-btn--chip" href={link.href} aria-current={current === link.href ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <h1 className="dw-h1">{title}</h1>
        <p className="dw-lead">{lead}</p>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
