import { useEffect, useState } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { ESSENCE_IDS, getEssenceDef, MOON_TEAR_EFFECT_ID } from '../../data/essences'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
}

export default function EssenceChamber({ state, dispatch }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const moonFx = state.activeEffects.find(
    (e) => e.id === MOON_TEAR_EFFECT_ID && (e.expiresAt == null || e.expiresAt > now),
  )
  const moonExpires = moonFx?.expiresAt

  const moonQty = state.essences.find((s) => s.essenceId === ESSENCE_IDS.moonTear)?.quantity ?? 0

  function activateMoon() {
    dispatch({ type: 'USE_ESSENCE_CHAMBER', essenceId: ESSENCE_IDS.moonTear })
  }

  return (
    <section className="rounded-2xl border border-cyan-900/40 bg-slate-900/80 p-4 sm:p-6 space-y-4">
      <h3 className="text-lg font-semibold text-cyan-100 flex items-center gap-2">🌙 Essenskammer</h3>
      <p className="text-slate-400 text-sm">
        Aktivér Månetåre for øget chance for essens-drops i minen i 5 minutter. Forbruger én essens.
      </p>

      {moonExpires != null && moonExpires > now && (
        <p className="text-sm text-cyan-200/95 bg-cyan-950/40 border border-cyan-700/50 rounded-lg px-3 py-2">
          Måne-buff aktiv — udløber{' '}
          {new Date(moonExpires).toLocaleTimeString('da-DK', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={moonQty < 1}
          onClick={activateMoon}
          className="min-h-[48px] px-6 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 font-bold text-white"
        >
          Brug Månetåre ({moonQty})
        </button>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-2">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">Dine essenser</h4>
        {state.essences.length === 0 ? (
          <p className="text-slate-500 text-sm">Ingen essenser endnu — grav i minen eller køb på markedet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            {state.essences.map((s) => {
              const def = getEssenceDef(s.essenceId)
              return (
                <li
                  key={s.essenceId}
                  className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-lg">{def?.icon ?? '✧'}</span>
                  <span className="text-slate-200 flex-1">{def?.name ?? s.essenceId}</span>
                  <span className="text-amber-200 font-mono">×{s.quantity}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
