import type { Dispatch } from 'react'
import type { GameState } from '../types'
import type { Action } from '../lib/gameState'
import { ENABLE_DEV_CHEATS } from './featureFlags'
import { xpToGainLevels } from './devCheats'

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
}

export function addLevelsCheats(state: GameState, dispatch: Dispatch<Action>, amount: number) {
  const xp = xpToGainLevels(state, amount)
  if (xp <= 0) return
  console.log('[DEV CHEAT]', 'GAIN_XP', xp, `(+${amount} level)`)
  dispatch({ type: 'GAIN_XP', amount: xp })
}

export function addGoldCheats(dispatch: Dispatch<Action>, amount: number) {
  if (amount <= 0) return
  console.log('[DEV CHEAT]', 'EARN_GOLD', amount)
  dispatch({ type: 'EARN_GOLD', amount })
}

export function addReputationCheats(dispatch: Dispatch<Action>, amount: number) {
  if (amount <= 0) return
  console.log('[DEV CHEAT]', 'GAIN_REPUTATION', amount)
  dispatch({ type: 'GAIN_REPUTATION', amount })
}

export default function DevCheatPanel({ state, dispatch }: Props) {
  if (!ENABLE_DEV_CHEATS) return null

  return (
    <>
      <hr className="border-slate-800" />

      <section
        className="rounded-lg border border-orange-500/35 bg-orange-950/25 p-2"
        aria-label="Developer Tools"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-300/90 mb-2 px-1">
          🔧 Developer Tools
        </h3>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => addLevelsCheats(state, dispatch, 1)}
            className="w-full rounded-lg bg-violet-700/90 hover:bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            [DEV] Level +1
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => addGoldCheats(dispatch, 1000)}
            className="w-full rounded-lg bg-amber-600/90 hover:bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            [DEV] Guld +1000
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => addReputationCheats(dispatch, 1)}
            className="w-full rounded-lg bg-fuchsia-700/90 hover:bg-fuchsia-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            [DEV] Omdømme +1
          </button>
        </div>
      </section>
    </>
  )
}
