import {
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'

let redirectStarted = false

export function consumeRedirect(auth: Auth) {
  if (redirectStarted) return Promise.resolve(null)
  redirectStarted = true
  return getRedirectResult(auth)
}

function wantsRedirect() {
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  return iOS || standalone
}

async function signInWith(auth: Auth, provider: GoogleAuthProvider | OAuthProvider) {
  if (wantsRedirect()) {
    await signInWithRedirect(auth, provider)
    return
  }
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    const code = errorCode(error)
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw error
  }
}

export function signInGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWith(auth, provider)
}

export function signInApple(auth: Auth) {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  return signInWith(auth, provider)
}

export function signOutDesk(auth: Auth) {
  return signOut(auth)
}

export function actorName(user: User): string {
  const name = user.displayName?.trim()
  if (name) return name.slice(0, 80)
  return (user.email ?? 'Desk').slice(0, 80)
}

export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) return String((error as { code: unknown }).code)
  return ''
}

export function explainAuth(error: unknown): string {
  const code = errorCode(error)
  if (code === 'auth/unauthorized-domain') return 'Add this domain under Auth → Settings → Authorized domains.'
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in closed.'
  if (code === 'auth/account-exists-with-different-credential') return 'That email already uses the other provider.'
  if (code === 'auth/operation-not-allowed') return 'Turn that provider on in Firebase Auth.'
  if (error instanceof Error && error.message) return error.message
  return 'Sign-in failed.'
}

export function explainWrite(error: unknown): string {
  const code = errorCode(error)
  if (code.includes('permission-denied')) return 'Blocked by desk rules.'
  if (code.includes('unauthenticated')) return 'Sign in again.'
  if (code.includes('unavailable')) return 'Saved on this phone. It will sync.'
  if (code.startsWith('storage/')) return 'Files need Cloud Storage. The desk works without them.'
  if (error instanceof Error && error.message && !error.message.startsWith('Firebase')) return error.message
  return 'Could not save.'
}
