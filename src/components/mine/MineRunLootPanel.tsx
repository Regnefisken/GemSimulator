import { useState, type Dispatch } from 'react'
import type { FoundLootEntry, GameState, RunInventory } from '../../types'
import type { Action } from '../../lib/gameState'
import { getNextRescueBagUpgrade } from '../../data/rescueBagUpgrades'

function entryLabel(e: FoundLootEntry): string {
  switch (e.kind) {
    case 'gem':
      return e.gem.name
    case 'coal':
      return `${e.quantity} kul`
    case 'ore':
      return `${e.ore.quantity}× ${e.ore.metalName} malm`
    case 'nugget':
      return `${e.nugget.quantity}× ${e.nugget.metalName} klump`
    case 'rough_stone':
      return 'Rå klippe'
  }
}

type Props = {
  state: GameState
  runInventory: RunInventory
  dispatch: Dispatch<Action>
}

/** Run-loot + redningspose (D46 / MINE_MOVE_* + D48). */
export default function MineRunLootPanel({ state, runInventory, dispatch }: Props) {
  const [open, setOpen] = useState(false)
  const { foundLoot, rescueBag, rescueBagCapacity } = runInventory
  const nextUpgrade = getNextRescueBagUpgrade(rescueBagCapacity)
  const canAffordUpgrade = nextUpgrade != null && state.hubInventory.gold >= nextUpgrade.goldCost
  const meetsLevel = nextUpgrade != null && state.level >= nextUpgrade.minLevel

  return (
    <div className="pointer-events-auto absolute top-[7.5rem] right-2 z-[42] max-w-[min(92vw,280px)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[40px] px-2.5 py-2 rounded-lg border border-teal-700/50 bg-slate-950/90 text-left text-xs font-semibold text-teal-100 shadow-lg backdrop-blur-sm hover:bg-slate-900/95"
      >
        <span className="mr-1.5">🎒</span>
        Redningspose {rescueBag.length}/{rescueBagCapacity}
        <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
          Fund på run: {foundLoot.length} · klik for at flytte
        </span>
      </button>
      {open && (
        <div className="mt-1.5 max-h-[min(50vh,360px)] overflow-y-auto rounded-lg border border-slate-700/80 bg-slate-950/95 p-2 shadow-xl backdrop-blur-md space-y-3 text-[11px]">
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Fund (tabes ved død)</h3>
            {foundLoot.length === 0 ? (
              <p className="text-slate-500 italic">Tomt</p>
            ) : (
              <ul className="space-y-1">
                {foundLoot.map((e, i) => (
                  <li
                    key={`found-${i}-${entryLabel(e)}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-900/80 px-2 py-1.5 border border-slate-800/80"
                  >
                    <span className="text-slate-200 truncate min-w-0">{entryLabel(e)}</span>
                    <button
                      type="button"
                      disabled={rescueBag.length >= rescueBagCapacity}
                      title={rescueBag.length >= rescueBagCapacity ? 'Posen er fuld' : 'Flyt til redningspose'}
                      onClick={() => dispatch({ type: 'MINE_MOVE_TO_RESCUE_BAG', foundIndex: i })}
                      className="shrink-0 min-h-[32px] px-2 rounded bg-teal-900/60 border border-teal-600/40 text-teal-100 text-[10px] font-semibold disabled:opacity-35 disabled:cursor-not-allowed hover:bg-teal-800/60"
                    >
                      → Pose
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Redningspose (overlever død)</h3>
            {rescueBag.length === 0 ? (
              <p className="text-slate-500 italic">Tomt</p>
            ) : (
              <ul className="space-y-1">
                {rescueBag.map((e, i) => (
                  <li
                    key={`rescue-${i}-${entryLabel(e)}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-teal-950/40 px-2 py-1.5 border border-teal-800/40"
                  >
                    <span className="text-teal-100/95 truncate min-w-0">{entryLabel(e)}</span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'MINE_MOVE_FROM_RESCUE_BAG', rescueIndex: i })}
                      className="shrink-0 min-h-[32px] px-2 rounded bg-slate-800/80 border border-slate-600/50 text-slate-200 text-[10px] font-semibold hover:bg-slate-700/80"
                    >
                      ← Fund
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {nextUpgrade && (
            <section className="pt-1 border-t border-slate-700/60">
              <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Opgrader pose (D48)</h3>
              <p className="text-slate-400 text-[10px] mb-1.5">
                Næste: <span className="text-slate-200 font-mono">{rescueBagCapacity}</span> →{' '}
                <span className="text-teal-200 font-mono">{nextUpgrade.rescueBagCapacity}</span> pladser ·{' '}
                <span className="text-amber-200/90">{nextUpgrade.goldCost} g</span> · lvl {nextUpgrade.minLevel}
              </p>
              <button
                type="button"
                disabled={!canAffordUpgrade || !meetsLevel}
                title={
                  !meetsLevel
                    ? `Kræver level ${nextUpgrade.minLevel}`
                    : !canAffordUpgrade
                      ? 'Ikke nok guld'
                      : undefined
                }
                onClick={() => dispatch({ type: 'RESCUE_BAG_UPGRADE' })}
                className="w-full min-h-[36px] rounded-md bg-amber-900/50 border border-amber-600/40 text-amber-100 text-[10px] font-semibold hover:bg-amber-800/50 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Køb opgradering
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
