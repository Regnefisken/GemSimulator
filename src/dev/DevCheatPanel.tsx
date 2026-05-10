import { useState, type Dispatch } from 'react'
import type { GameState } from '../types'
import type { Action } from '../lib/gameState'
import { ENABLE_DEV_CHEATS } from './featureFlags'
import { xpToGainLevels } from './devCheats'
import { setDevMineGearProtect, isDevMineGearProtectEnabled } from './devMineGearProtect'
import {
  devFillGemsToCapacity,
  devSpawnExoticMetalPack,
  devSpawnIngotsEveryMetal,
  devSpawnOreAndNuggetKit,
  devSpawnRandomGems,
  devSpawnRoughStones,
} from './devInventoryCheats'

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

/** @deprecated Brug `devSpawnExoticMetalPack` fra `./devInventoryCheats` */
export function spawnNewMetalsCheats(dispatch: Dispatch<Action>) {
  devSpawnExoticMetalPack(dispatch)
}

const btnBase =
  'w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-white shadow-sm transition-colors leading-snug'

export default function DevCheatPanel({ state, dispatch }: Props) {
  const [mineGearProtect, setMineGearProtect] = useState(() => isDevMineGearProtectEnabled())

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
        <label className="flex items-start gap-2.5 rounded-lg border border-orange-500/35 bg-orange-950/45 px-2.5 py-2 mb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 accent-orange-500 shrink-0"
            checked={mineGearProtect}
            onChange={(e) => {
              const on = e.target.checked
              setDevMineGearProtect(on)
              setMineGearProtect(on)
            }}
          />
          <span className="text-[11px] text-orange-100/95 leading-snug min-w-0">
            <span className="font-semibold block text-orange-200">Beskyttelse i minen</span>
            Du tager ikke skade fra mobs; rustning slider ikke; hakke og sværd slides ikke ved brug.
          </span>
        </label>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => addLevelsCheats(state, dispatch, 1)}
            className={`${btnBase} bg-violet-700/90 hover:bg-violet-600`}
          >
            [DEV] Level +1
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => addGoldCheats(dispatch, 1000)}
            className={`${btnBase} bg-amber-600/90 hover:bg-amber-500`}
          >
            [DEV] Guld +1000
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => addReputationCheats(dispatch, 1)}
            className={`${btnBase} bg-fuchsia-700/90 hover:bg-fuchsia-600`}
          >
            [DEV] Omdømme +1
          </button>
        </div>

        <div className="mt-3 border-t border-orange-500/25 pt-2 px-0.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-orange-200/90 mb-1">Lager (dev)</h4>
          <p className="text-[10px] text-orange-200/50 mb-2 leading-snug">
            Fyld råvarer og gems til test (FPS, smedje, slibning) uden at mine.
          </p>

          <p className="text-[10px] font-semibold text-slate-400 mb-1">Rå klipper</p>
          <div className="flex flex-col gap-1.5 mb-2">
            <button
              type="button"
              className={`${btnBase} bg-slate-700/90 hover:bg-slate-600`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'rough stones ×15 mixed')
                devSpawnRoughStones(dispatch, 15, 'mixed')
              }}
            >
              +15 rå klipper (mix kvalitet)
            </button>
            <button
              type="button"
              className={`${btnBase} bg-slate-700/90 hover:bg-slate-600`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'rough stones ×8 fine')
                devSpawnRoughStones(dispatch, 8, 'fine')
              }}
            >
              +8 fine klipper
            </button>
            <button
              type="button"
              className={`${btnBase} bg-slate-700/90 hover:bg-slate-600`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'rough stones ×5 pristine')
                devSpawnRoughStones(dispatch, 5, 'pristine')
              }}
            >
              +5 pristine klipper
            </button>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 mb-1">Metalbarer</p>
          <div className="flex flex-col gap-1.5 mb-2">
            <button
              type="button"
              className={`${btnBase} bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/40`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'ingots 1× each metal')
                devSpawnIngotsEveryMetal(dispatch, 1)
              }}
            >
              1× bar af hvert metal (12 typer)
            </button>
            <button
              type="button"
              className={`${btnBase} bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/40`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'ingots 5× each metal')
                devSpawnIngotsEveryMetal(dispatch, 5)
              }}
            >
              5× bar af hvert metal
            </button>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 mb-1">Malm & klumper</p>
          <div className="flex flex-col gap-1.5 mb-2">
            <button
              type="button"
              className={`${btnBase} bg-slate-700/90 hover:bg-slate-600`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'ore+nugget kit mineable')
                devSpawnOreAndNuggetKit(dispatch)
              }}
            >
              Malm + klump (alle minebare)
            </button>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 mb-1">Eksotiske metaller</p>
          <div className="flex flex-col gap-1.5 mb-2">
            <button
              type="button"
              className={`${btnBase} bg-slate-700/90 hover:bg-slate-600`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'exotic metal pack')
                devSpawnExoticMetalPack(dispatch)
              }}
            >
              Ti / Pt malm+klump+bar + Orichalcum/Elektrum-bar
            </button>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 mb-1">Ædelsten (FPS / stres)</p>
          <p className="text-[9px] text-slate-500 mb-1 leading-snug">
            Uden XP. Brug inventory med mange kort til FPS-tjek (mål ≥30 ved 50+).
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className={`${btnBase} bg-emerald-900/55 hover:bg-emerald-800/65 border border-emerald-700/35`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'DEV_BULK_RANDOM_GEMS 25')
                devSpawnRandomGems(dispatch, 25)
              }}
            >
              +25 tilfældige gems
            </button>
            <button
              type="button"
              className={`${btnBase} bg-emerald-900/55 hover:bg-emerald-800/65 border border-emerald-700/35`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'DEV_BULK_RANDOM_GEMS 50')
                devSpawnRandomGems(dispatch, 50)
              }}
            >
              +50 tilfældige gems
            </button>
            <button
              type="button"
              className={`${btnBase} bg-emerald-900/55 hover:bg-emerald-800/65 border border-emerald-700/35`}
              onClick={() => {
                console.log('[DEV CHEAT]', 'DEV_BULK_RANDOM_GEMS fill cap')
                devFillGemsToCapacity(dispatch, state)
              }}
            >
              Fyld gem-lager til max
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
