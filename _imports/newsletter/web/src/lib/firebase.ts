import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { PROJECT_ID } from './compliance';

export type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

async function loadConfig(): Promise<FirebaseConfig> {
  try {
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (response.ok) {
      const json = (await response.json()) as FirebaseConfig;
      if (json?.projectId) return json;
    }
  } catch {
    // The Vite dev server has no Hosting reserved URL. Localhost falls through.
  }
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return {
      apiKey: 'demo',
      authDomain: 'localhost',
      projectId: PROJECT_ID,
      appId: 'demo:newsletter-web',
    };
  }
  throw new Error('Firebase Hosting has not published /__/firebase/init.json for this site.');
}

let started: Promise<FirebaseBundle> | null = null;

async function boot(): Promise<FirebaseBundle> {
  const config = await loadConfig();
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8181);
  }
  return { app, auth, db };
}

export function startFirebase() {
  if (!started) started = boot();
  return started;
}
