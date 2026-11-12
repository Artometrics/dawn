import type { ReactNode } from 'react';

type PageShellProps = {
  title: string;
  lead?: ReactNode;
  wide?: boolean;
  /** The top bar already names the page. Set this when the heading says more than the bar does. */
  showTitle?: boolean;
  /** Extra classes for the page wrapper, so a page can add its own scoped styles. */
  className?: string;
  children?: ReactNode;
};

/** Body of a standalone page. The top bar and sidebar come from the app shell around every route. */
export function PageShell({ title, lead, wide, showTitle, className, children }: PageShellProps) {
  return (
    <div className={`dw-page${className ? ` ${className}` : ''}`}>
      <main id="main" className={`dw-main${wide ? ' dw-main--wide' : ''}`}>
        <h1 className={showTitle ? 'dw-h1' : 'dw-sr-only'}>{title}</h1>
        {lead ? <p className="dw-lead">{lead}</p> : null}
        {children}
      </main>
    </div>
  );
}
