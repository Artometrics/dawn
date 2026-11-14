import { Link } from 'react-router-dom';

export function Masthead() {
  return (
    <header className="px-5 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-12">
      <div className="flex items-center justify-between gap-4 py-3">
        <Link to="/" className="font-display text-[1.7rem] leading-none tracking-[-0.03em] text-ink">
          Artometrics
        </Link>
        <nav className="flex gap-5 font-ui text-[0.95rem]">
          <Link to="/archive" className="text-ink hover:text-blue">Archive</Link>
          <Link to="/admin" className="text-ink hover:text-blue">Desk</Link>
        </nav>
      </div>
      <div className="mast-rule h-[3px] bg-blue" />
    </header>
  );
}

export function Colophon() {
  return (
    <footer className="grid gap-8 px-5 py-12 md:grid-cols-2 md:px-12">
      <div>
        <p className="font-display text-3xl tracking-[-0.03em]">Artometrics</p>
        <p className="mt-3 max-w-[42ch] font-text text-lg text-ink">
          A studio letter. We store your email, the time you consented, and whether a letter was opened or a link was clicked. The list is not sold.
        </p>
      </div>
      <address className="font-ui text-sm not-italic leading-relaxed text-ink-soft">
        <span className="block text-ink">Artometrics</span>
        <span className="block">548 Market Street, PMB 00000</span>
        <span className="block">San Francisco, CA 94104</span>
        <span className="block">United States</span>
        <span className="mt-2 block">Address is a placeholder until the studio files the real one.</span>
      </address>
    </footer>
  );
}
