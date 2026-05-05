import { useState } from 'react'
import type { GameState, MetalName } from '../../types'
import type { Action } from '../../lib/gameState'
import { METALS } from '../../data/metals'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
}

export default function AlloyStation({ state, dispatch }: Props) {
  const [a, setA] = useState<MetalName | ''>('')
  const [b, setB] = useState<MetalName | ''>('')

  const options = state.metalIngots.filter((i) => i.quantity > 0)

  function craft() {
    if (!a || !b) return
    dispatch({ type: 'CRAFT_ALLOY', a, b })
  }

  return (
    <section className="rounded-2xl border border-amber-900/50 bg-slate-900/80 p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">⚗️ Legeringsstation</h2>
      <p className="text-slate-400 text-sm mb-4">Kombinér metalbarer til nye legeringer.</p>

      {options.length === 0 ? (
        <p className="text-slate-500 text-sm">Du har ingen metalbarer endnu.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <label className="flex-1 flex flex-col gap-1 text-xs text-slate-400">
            Metal A
            <select
              value={a}
              onChange={(e) => setA(e.target.value as MetalName | '')}
              className="rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
            >
              <option value="">Vælg…</option>
              {options.map((i) => (
                <option key={i.metalName} value={i.metalName}>
                  {METALS[i.metalName].icon} {i.metalName} ({i.quantity})
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 flex flex-col gap-1 text-xs text-slate-400">
            Metal B
            <select
              value={b}
              onChange={(e) => setB(e.target.value as MetalName | '')}
              className="rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
            >
              <option value="">Vælg…</option>
              {options.map((i) => (
                <option key={`b-${i.metalName}`} value={i.metalName}>
                  {METALS[i.metalName].icon} {i.metalName} ({i.quantity})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={craft}
            disabled={!a || !b}
            title="Kobber + Tin → Bronze"
            className="min-h-[44px] px-4 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 font-semibold text-white text-sm"
          >
            Lav legering
          </button>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Opskrifter: Kobber + Tin → Bronze · Guld + Mithril → Orichalcum · Guld + Sølv → Elektrum.
      </p>
    </section>
  )
}
