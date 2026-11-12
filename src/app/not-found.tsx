import type { Metadata } from 'next';
import Link from 'next/link';
import { NotFoundHint } from '@/components/site/not-found-hint';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Not found · Dawn',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageShell showTitle title="That page is not here" lead="The address does not match a page in Dawn.">
      <div className="dw-empty">
        <img src="/tiles/you-0.png" alt="" width={72} height={72} />
        <h2>404</h2>
        <NotFoundHint />
        <Link className="dw-btn dw-btn--primary" href="/">Back to Atlas</Link>
      </div>
    </PageShell>
  );
}
