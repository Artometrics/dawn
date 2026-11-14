export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-6 text-cream">
      <div className="w-full max-w-xs">
        <p className="font-display text-6xl leading-none tracking-[0.04em]">ARTO</p>
        <div className="issue-rule mt-4 h-1 bg-signal" />
      </div>
    </div>
  )
}

export function BootError({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-6 text-cream">
      <div className="w-full max-w-sm">
        <p className="font-display text-5xl leading-none">ARTO</p>
        <div className="issue-rule my-4 h-1 bg-signal" />
        <p>{message}</p>
      </div>
    </div>
  )
}
