import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import type { Dispatch } from 'react'
import { CONSUMABLE_BAG_MAX, totalConsumableQty } from '../../lib/gameState'
import { findConsumableDef } from '../../data/consumables'
import VoxelScene from '../VoxelScene'

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
}

export default function ConsumablesInventoryTab({ state, dispatch }: Props) {
  const used = totalConsumableQty(state)

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Forbrugsgenstande fra alkymisten. I minen: taster <span className="font-mono text-slate-200">1</span>–
        <span className="font-mono text-slate-200">3</span> bruger hurtig-slot.
      </p>
      <p className="text-xs text-slate-500">
        Lager:{' '}
        <span className="font-mono text-emerald-200">
          {used}/{CONSUMABLE_BAG_MAX}
        </span>
      </p>

      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Hurtige slots (mine)</p>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => {
            const id = state.consumableQuickSlots[i]
            const def = id ? findConsumableDef(id) : undefined
            return (
              <div key={i} className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-[10px] text-slate-500">Slot {i + 1}</span>
                <span className="text-xs text-slate-200 truncate">{def?.name ?? '(tom)'}</span>
                <button
                  type="button"
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                  onClick={() => dispatch({ type: 'SET_CONSUMABLE_QUICK_SLOT', slotIndex: i, consumableId: null })}
                >
                  Ryd
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {state.hubInventory.consumables.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen forbrugsvarer endnu — besøg alkymistværkstedet.</p>
      ) : (
        <ul className="space-y-3">
          {state.hubInventory.consumables.map((row) => {
            const def = findConsumableDef(row.consumableId)
            if (!def) return null
            return (
              <li
                key={row.consumableId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/50 p-3"
              >
                <div className="w-14 h-14 shrink-0 rounded-lg bg-slate-900 overflow-hidden border border-slate-600/50">
                  <VoxelScene
                    data={def.pixelItem.data}
                    colorMap={def.pixelItem.colorMap}
                    className="!block !max-w-none scale-75"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100">{def.name}</p>
                  <p className="text-xs text-slate-500">×{row.quantity}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[0, 1, 2].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className="min-h-[36px] px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-600/60"
                      onClick={() =>
                        dispatch({
                          type: 'SET_CONSUMABLE_QUICK_SLOT',
                          slotIndex: slot,
                          consumableId: row.consumableId,
                        })
                      }
                    >
                      → {slot + 1}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
