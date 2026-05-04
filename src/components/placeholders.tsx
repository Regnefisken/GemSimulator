import type { ReactNode } from 'react'

type BackProps = { onBack: () => void }

function BackBar({ onBack, label = '← Tilbage til kortet' }: BackProps & { label?: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
    >
      {label}
    </button>
  )
}

type SmithyProps = BackProps & {
  children: ReactNode
}

export function SmithyPlaceholder({ onBack, children }: SmithyProps) {
  return (
    <div className="space-y-8">
      <BackBar onBack={onBack} />
      {children}
    </div>
  )
}

export function ShopScreenPlaceholder({ onBack, backLabel }: BackProps & { backLabel?: string }) {
  return (
    <div className="space-y-6">
      <BackBar onBack={onBack} label={backLabel} />
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
        <p className="text-4xl mb-4">🪙</p>
        <h2 className="text-xl font-bold text-slate-100">Butikken</h2>
        <p className="text-slate-400 mt-2 text-sm">Køb opgraderinger, hakker og mere.</p>
        <p className="text-slate-500 mt-6 text-sm">Fuld butik kommer i Fase 7.</p>
      </div>
    </div>
  )
}

export function JewelryPlaceholder({ onBack }: BackProps) {
  return (
    <div className="space-y-6">
      <BackBar onBack={onBack} />
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
        <p className="text-4xl mb-4">💍</p>
        <h2 className="text-xl font-bold text-slate-100">Smykkeværkstedet</h2>
        <p className="text-slate-400 mt-2 text-sm">Kombinér ædelsten og metaller til smykker.</p>
        <p className="text-slate-500 mt-6 text-sm">Kommer i Fase 8.</p>
      </div>
    </div>
  )
}
