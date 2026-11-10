import type { Metadata } from 'next';
import { NotFoundHint } from '@/components/site/not-found-hint';
import { PageShell } from '@/components/site/page-shell';
import { SITE_NAV } from '@/lib/site/nav';

export const metadata: Metadata = {
  title: 'Not found · Dawn',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageShell title="That page is not here" lead="The address does not match a page in Dawn. Pick a place to go instead.">
      <div className="dw-empty">
        <img src="/tiles/you-0.png" alt="" width={72} height={72} />
        <h2>404</h2>
        <NotFoundHint />
      </div>
      <ul className="dw-grid dw-list" style={{ listStyle: 'none', padding: 0 }}>
        {SITE_NAV.map((link) => (
          <li key={link.href}>
            <a className="dw-btn dw-btn--block" href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
