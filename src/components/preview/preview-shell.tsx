import Link from 'next/link';
import './preview.css';

export function PreviewShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dw-page dawn-preview">
      <main id="preview-main" className="dw-main dw-main--wide">
        <div className="pv-sub">
          <span className="dw-badge dw-badge--accent">Demo, agents off</span>
          <Link prefetch={false} className="dw-btn dw-btn--chip" href="/preview">All review pages</Link>
        </div>
        <h1 className="dw-h1">{title}</h1>
        <p className="dw-lead">{lead}</p>
        {children}
      </main>
    </div>
  );
}
