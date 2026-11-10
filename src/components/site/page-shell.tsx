import type { ReactNode } from 'react';
import { SITE_FOOTER, SITE_NAV } from '@/lib/site/nav';

/** Top bar for standalone pages: brand, the page list as chips, and the way back to the town. */
export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="dw-header">
      <div className="dw-header-bar">
        <a className="dw-brand" href="/" aria-label="Dawn, back to the town">DAWN</a>
        <nav className="dw-nav" aria-label="Dawn">
          {SITE_NAV.map((link) => (
            <a
              key={link.href}
              className="dw-btn dw-btn--chip"
              href={link.href}
              aria-current={link.href === current ? 'page' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="dw-footer">
      <div className="dw-footer-bar">
        <span>Dawn is a private prototype.</span>
        {SITE_FOOTER.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </div>
    </footer>
  );
}

type PageShellProps = {
  title: string;
  /** Pathname of this page; marks its chip in the header. */
  current?: string;
  lead?: ReactNode;
  wide?: boolean;
  /** Extra classes for the page wrapper, so a page can add its own scoped styles. */
  className?: string;
  children?: ReactNode;
};

export function PageShell({ title, current, lead, wide, className, children }: PageShellProps) {
  return (
    <div className={`dw-page${className ? ` ${className}` : ''}`}>
      <a className="dw-skip" href="#main">Skip to content</a>
      <SiteHeader current={current} />
      <main id="main" className={`dw-main${wide ? ' dw-main--wide' : ''}`}>
        <h1 className="dw-h1">{title}</h1>
        {lead ? <p className="dw-lead">{lead}</p> : null}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
