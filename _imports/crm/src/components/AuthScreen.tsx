import { Button } from '@/components/ui'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'

export function AuthScreen() {
  const { emulators } = useServices()
  const session = useSession()
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-6 text-cream">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-6xl leading-none tracking-[0.04em]">ARTO</h1>
        <div className="issue-rule my-4 h-1 bg-signal" />
        <p className="text-cream-dim">Desk</p>
        <div className="mt-8 grid gap-3">
          <Button onClick={() => void session.google()}>Google</Button>
          <Button variant="quiet" onClick={() => void session.apple()}>Apple</Button>
          {emulators ? (
            <Button variant="line" onClick={() => void session.preview()}>
              Preview as Kyle
            </Button>
          ) : null}
        </div>
        {session.error ? <p className="mt-4 bg-signal px-3 py-2 text-sm font-semibold text-white">{session.error}</p> : null}
      </div>
    </div>
  )
}

export function Denied() {
  const session = useSession()
  const verified = session.user?.emailVerified
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-6 text-cream">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-5xl leading-none">Not this desk</h1>
        <div className="issue-rule my-4 h-1 bg-signal" />
        <p>{session.user?.email || 'No email on this account.'}</p>
        <p className="mt-3 text-cream-dim">
          {verified
            ? 'The desk is team@artometrics.com and kylesmcauliffe@gmail.com. Apple Hide My Email will not match.'
            : 'This sign-in did not verify the email. Use Google, or the Apple account that shares the allowlisted address.'}
        </p>
        <Button className="mt-6" variant="quiet" onClick={() => void session.signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
