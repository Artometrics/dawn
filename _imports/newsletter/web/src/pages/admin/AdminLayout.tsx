import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isAllowlisted } from '@/lib/compliance';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';

const links = [
  { to: '/admin', label: 'List', end: true },
  { to: '/admin/write', label: 'Write', end: false },
  { to: '/admin/letters', label: 'Letters', end: false },
  { to: '/admin/counts', label: 'Counts', end: false },
  { to: '/admin/log', label: 'Log', end: false },
];

function Item({ to, label, end }: { to: string; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('flex min-h-11 items-center font-ui text-[0.95rem]', isActive ? 'text-blue' : 'text-ink hover:text-blue')
      }
    >
      {label}
    </NavLink>
  );
}

export function AdminLayout() {
  const { phase, error, user, auth, backend, health } = useSession();

  if (phase === 'loading') {
    return <p className="px-5 py-16 font-text text-xl text-ink-soft">Opening the desk.</p>;
  }
  if (phase === 'error') {
    return <p className="px-5 py-16 font-ui text-blue" role="alert">{error}</p>;
  }
  if (!user || !auth) {
    return (
      <div className="min-h-dvh bg-paper px-5 py-10 text-ink md:px-12">
        <p className="font-display text-[1.7rem] tracking-[-0.03em]">Artometrics</p>
        <div className="mast-rule mt-3 h-[3px] w-full bg-blue" />
        <h1 className="mt-10 max-w-[12ch] font-display text-[clamp(2.8rem,7vw,5rem)] leading-[0.92] tracking-[-0.04em]">
          The desk is locked.
        </h1>
        <p className="mt-5 max-w-[38ch] font-text text-xl text-ink-soft">
          Sign in with Google as team@artometrics.com or kylesmcauliffe@gmail.com. On the local emulator, pick one of those addresses in the popup.
        </p>
        <Button
          className="mt-8"
          onClick={() => {
            if (!auth) return;
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            void signInWithPopup(auth, provider);
          }}
        >
          Sign in with Google
        </Button>
      </div>
    );
  }
  if (!isAllowlisted(user.email)) {
    return (
      <div className="min-h-dvh bg-paper px-5 py-12 text-ink md:px-12">
        <h1 className="max-w-[14ch] font-display text-5xl tracking-[-0.03em]">This account is not on the desk list.</h1>
        <p className="mt-4 font-text text-xl">{user.email}</p>
        <Button className="mt-8" variant="line" onClick={() => signOut(auth)}>Sign out</Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper text-ink md:grid md:grid-cols-[13.5rem_1fr]">
      <aside className="hidden border-r border-line px-5 py-6 md:block">
        <p className="font-display text-2xl tracking-[-0.03em]">Artometrics</p>
        <p className="mt-1 font-ui text-sm text-ink-soft">Desk</p>
        <nav className="mt-8 flex flex-col">
          {links.map((link) => <Item key={link.to} {...link} />)}
        </nav>
      </aside>
      <div className="pb-28 md:pb-10">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-8">
          <p className="font-ui text-sm text-ink-soft">{user.email}</p>
          <span className="flex items-center gap-4">
            <Link to="/admin/log" className="min-h-11 font-ui text-sm text-ink hover:text-blue md:hidden">Log</Link>
            <button type="button" className="min-h-11 font-ui text-sm text-ink hover:text-blue" onClick={() => signOut(auth)}>
              Sign out
            </button>
          </span>
        </div>
        {backend === 'off' ? (
          <div className="mx-5 border border-blue px-4 py-3 md:mx-8" role="status">
            <p className="font-ui text-blue">The back end is not enabled yet.</p>
            <p className="mt-1 font-ui text-sm text-ink-soft">
              Drafts can still be saved. Confirmation mail, sending, and the subscriber list start when Cloud Functions are deployed.
            </p>
          </div>
        ) : null}
        {backend === 'ready' && health ? (
          <p className="mx-5 mt-2 font-ui text-sm text-ink-soft md:mx-8">
            {health.transport === 'dry-run'
              ? 'Transport is a dry run. Sends are logged and nobody is mailed.'
              : 'Resend is live. A send will mail the confirmed list.'}
            {health.gemini === 'ready' ? ' Gemini can draft.' : ' Gemini is off, so drafts stay local.'}
          </p>
        ) : null}
        <div className="px-5 py-6 md:px-8">
          <Outlet />
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-paper px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] md:hidden">
        {links.slice(0, 4).map((link) => <Item key={link.to} {...link} />)}
      </nav>
    </div>
  );
}
