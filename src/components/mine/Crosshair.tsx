type CrosshairState = 'normal' | 'hover-active' | 'swing'

type Props = {
  state: CrosshairState
}

export default function Crosshair({ state }: Props) {
  const active = state === 'hover-active'
  const swing = state === 'swing'
  const cls =
    (active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-100') +
    (swing ? ' animate-ping [animation-duration:120ms] scale-110' : '')

  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2">
      <svg width="28" height="28" viewBox="0 0 28 28" className={cls}>
        <circle cx="14" cy="14" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <line x1="14" y1="3" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="14" y1="20" x2="14" y2="25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="3" y1="14" x2="8" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="20" y1="14" x2="25" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}
