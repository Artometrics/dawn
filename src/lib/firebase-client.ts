import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';

export type DawnMode = 'emulator' | 'hosted' | 'offline';

type Boot = {
  mode: DawnMode;
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
};

let bootPromise: Promise<Boot> | null = null;

function onLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Production config is fetched at runtime from Firebase Hosting
 * (`/__/firebase/init.json`). Nothing secret is compiled into the client.
 * Localhost uses the Auth and Firestore emulators with a non-credential placeholder.
 */
export function bootFirebase(): Promise<Boot> {
  if (!bootPromise) bootPromise = boot();
  return bootPromise;
}

async function boot(): Promise<Boot> {
  if (typeof window === 'undefined') {
    return { mode: 'offline', app: null, auth: null, db: null };
  }

  const { initializeApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');

  if (onLocalHost()) {
    const app = initializeApp(
      {
        apiKey: 'demo',
        authDomain: 'localhost',
        projectId: 'dawn-510519',
        appId: 'demo-dawn',
      },
      'dawn',
    );
    const auth = getAuth(app);
    const db = getFirestore(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return { mode: 'emulator', app, auth, db };
  }

  try {
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('missing');
    const config = (await response.json()) as { apiKey?: string; projectId?: string; appId?: string };
    if (!config.apiKey || !config.projectId || !config.appId) throw new Error('incomplete');
    const app = initializeApp(config, 'dawn');
    return { mode: 'hosted', app, auth: getAuth(app), db: getFirestore(app) };
  } catch {
    return { mode: 'offline', app: null, auth: null, db: null };
  }
}

export function displayNameOf(user: User, fallback = 'You'): string {
  const name = user.displayName?.trim();
  if (name) return name.slice(0, 40);
  const email = user.email?.split('@')[0];
  if (email) return email.slice(0, 40);
  return fallback;
}
