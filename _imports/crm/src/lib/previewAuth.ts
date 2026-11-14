import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth'
import { errorCode } from '@/lib/auth'

export async function signInPreview(auth: Auth) {
  const email = 'kylesmcauliffe@gmail.com'
  const password = import.meta.env.VITE_PREVIEW_PASSWORD ?? ''; // redacted on import
  let cred
  try {
    cred = await signInWithEmailAndPassword(auth, email, password)
  } catch (error) {
    const code = errorCode(error)
    const missing = code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials'
    if (!missing) throw error
    cred = await createUserWithEmailAndPassword(auth, email, password)
  }
  if (!cred.user.emailVerified) {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer owner',
        },
        body: JSON.stringify({ localId: cred.user.uid, emailVerified: true }),
      },
    )
    if (!response.ok) throw new Error('Could not verify the preview account on the emulator.')
    await signOut(auth)
    await signInWithEmailAndPassword(auth, email, password)
  }
}
