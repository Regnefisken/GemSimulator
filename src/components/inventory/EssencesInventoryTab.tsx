import { useMemo } from 'react'
import type { GameState } from '../../types'
import { ESSENCES, getEssenceDef } from '../../data/essences'

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3 } as const

export default function EssencesInventoryTab({ state }: { state: GameState }) {
  const rows = useMemo(() => {
    const stacks = [...state.essences]
    stacks.sort((a, b) => {
      const da = getEssenceDef(a.essenceId)
      const db = getEssenceDef(b.essenceId)
      const ra = da ? RARITY_ORDER[da.rarity] : 99
      const rb = db ? RARITY_ORDER[db.rarity] : 99
      if (ra !== rb) return rb - ra
      return (da?.name ?? a.essenceId).localeCompare(db?.name ?? b.essenceId, 'da')
    })
    return stacks
  }, [state.essences])

  const total = useMemo(() => state.essences.reduce((s, e) => s + e.quantity, 0), [state.essences])

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Samlet på lager: <span className="font-mono text-slate-200">{total}</span> · Livsvarigt indsamlet:{' '}
        <span className="font-mono text-cyan-200/90">{state.totalEssencesCollected}</span>
      </p>
      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Ingen essenser endnu. Grav i minen, smelt metal eller køb på essensmarkedet i Smykkeværkstedet.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((s) => {
            const def = getEssenceDef(s.essenceId)
            const fallback = ESSENCES.find((e) => e.id === s.essenceId)
            const d = def ?? fallback
            return (
              <li
                key={s.essenceId}
                className="rounded-xl border border-slate-600 bg-slate-800/50 p-3 flex gap-3 items-start"
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {d?.icon ?? '✧'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-100">{d?.name ?? s.essenceId}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">{d?.rarity ?? '—'}</div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-snug">{d?.description}</p>
                </div>
                <span className="text-amber-200 font-mono text-sm shrink-0">×{s.quantity}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
