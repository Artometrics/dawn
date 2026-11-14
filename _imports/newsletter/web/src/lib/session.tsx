import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { probeHealth, type Health } from './api';
import { startFirebase } from './firebase';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

type Session = {
  phase: 'loading' | 'ready' | 'error';
  error: string | null;
  user: User | null;
  auth: Auth | null;
  db: Firestore | null;
  backend: 'loading' | 'ready' | 'off';
  health: Health | null;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    phase: 'loading',
    error: null,
    user: null,
    auth: null,
    db: null,
    backend: 'loading',
    health: null,
  });

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    startFirebase()
      .then(({ auth, db }) => {
        if (cancelled) return;
        stop = onAuthStateChanged(auth, (user) => {
          setSession((current) => ({ ...current, phase: 'ready', error: null, user, auth, db }));
        });
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSession((current) => ({
            ...current,
            phase: 'error',
            error: error.message || 'Firebase did not start.',
          }));
        }
      });
    probeHealth().then((health) => {
      if (cancelled) return;
      setSession((current) => ({ ...current, backend: health ? 'ready' : 'off', health }));
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Session is missing.');
  return session;
}
