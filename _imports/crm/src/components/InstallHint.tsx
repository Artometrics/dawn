import { useEffect, useState } from 'react'

type BeforeInstall = Event & { prompt: () => Promise<void> }

function isIos() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
}

export function InstallHint() {
  const [install, setInstall] = useState<BeforeInstall | null>(null)
  const [hide, setHide] = useState(() => localStorage.getItem('arto-install-hide') === '1')
  const ios = isIos() && !isStandalone()

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstall(event as BeforeInstall)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (hide || isStandalone()) return null
  if (!ios && !install) return null

  function dismiss() {
    localStorage.setItem('arto-install-hide', '1')
    setHide(true)
  }

  return (
    <div className="mt-4 border border-line px-3 py-3">
      <p className="text-sm">
        {ios ? 'Home screen. Share, then Add to Home Screen. Stays signed in.' : 'Install the desk on this phone.'}
      </p>
      <div className="mt-2 flex gap-4 text-sm font-semibold">
        {install ? (
          <button
            type="button"
            className="min-h-11 text-tiffany"
            onClick={() => {
              void install.prompt()
              dismiss()
            }}
          >
            Install
          </button>
        ) : null}
        <button type="button" className="min-h-11 text-cream-dim" onClick={dismiss}>
          Hide
        </button>
      </div>
    </div>
  )
}
