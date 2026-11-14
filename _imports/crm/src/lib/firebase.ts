import { initializeApp, type FirebaseApp, type FirebaseOptions, getApps } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

export type Services = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  storage: FirebaseStorage
  emulators: boolean
  appCheck: boolean
}

type EmuFlag = { __artoEmu?: boolean }

function demoConfig(): FirebaseOptions {
  return {
    apiKey: 'demo-api-key',
    authDomain: '127.0.0.1',
    projectId: 'crm-510519',
    storageBucket: 'crm-510519.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:artometrics',
  }
}

function configFromEnv(): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  if (!apiKey) return null
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'crm-510519.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'crm-510519',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'crm-510519.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:artometrics',
  }
}

async function loadHostingConfig(): Promise<FirebaseOptions> {
  const response = await fetch('/__/firebase/init.json')
  if (!response.ok) {
    throw new Error('No Firebase web app yet. Register one on crm-510519 so Hosting can serve /__/firebase/init.json.')
  }
  const json = (await response.json()) as FirebaseOptions
  if (!json.apiKey || !json.projectId) {
    throw new Error('Hosting did not return a Firebase web config.')
  }
  return json
}

async function loadConfig(): Promise<FirebaseOptions> {
  if (import.meta.env.PROD) return loadHostingConfig()
  const fromEnv = configFromEnv()
  if (fromEnv) return fromEnv
  return demoConfig()
}

function firstParty(config: FirebaseOptions): FirebaseOptions {
  const host = location.hostname
  const local = host === 'localhost' || host === '127.0.0.1'
  if (local) return config
  return { ...config, authDomain: host }
}

function makeAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch {
    return getAuth(app)
  }
}

function makeDb(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    try {
      return initializeFirestore(app, { localCache: memoryLocalCache() })
    } catch {
      return getFirestore(app)
    }
  }
}

let boot: Promise<Services> | null = null

export function bootFirebase(): Promise<Services> {
  if (!boot) boot = start()
  return boot
}

async function start(): Promise<Services> {
  const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true'
  const config = firstParty(await loadConfig())
  const app = getApps()[0] ?? initializeApp(config)
  const auth = makeAuth(app)
  const db = makeDb(app)
  const storage = getStorage(app)
  const flag = globalThis as EmuFlag
  if (useEmulators && !flag.__artoEmu) {
    const { connectLocalEmulators } = await import('./emulators')
    connectLocalEmulators(auth, db, storage)
    flag.__artoEmu = true
  }
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
  let appCheck = false
  if (siteKey && !useEmulators) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
    appCheck = true
  }
  return { app, auth, db, storage, emulators: useEmulators, appCheck }
}
