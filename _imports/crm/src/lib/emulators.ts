import { connectAuthEmulator, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { connectStorageEmulator, type FirebaseStorage } from 'firebase/storage'

export function connectLocalEmulators(auth: Auth, db: Firestore, storage: FirebaseStorage) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
