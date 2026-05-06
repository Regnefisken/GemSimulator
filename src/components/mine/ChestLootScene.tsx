import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import type { Area, GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { materialsCount } from '../../lib/gameState'
import { XP_REWARDS } from '../../lib/leveling'
import {
  rollBonusMineEssence,
  type ChestLootResult,
  type MineDrop,
} from '../../gem/mining'
import { getEssenceDef } from '../../data/essences'
import { findBlueprint } from '../../data/blueprints'
import { playEssenceFound, playRockBreak } from '../../lib/sounds'
import { useToast } from '../ui/ToastContext'
import ChestLootCard from './ChestLootCard'
import type { WorldChestEntity } from './3d/WorldChest'

type Props = {
  chest: WorldChestEntity
  area: Area
  state: GameState
  dispatch: Dispatch<Action>
  onClose: () => void
  onUpdateChest: (id: string, remaining: ChestLootResult, opened: boolean) => void
}

function extraMaterialsFromDrop(drop: MineDrop): number {
  switch (drop.kind) {
    case 'ore':
      return drop.ore.quantity
    case 'nugget':
      return drop.nugget.quantity
    case 'rough-stone':
      return 1
    default:
      return 0
  }
}

function applyDrop(dispatch: Dispatch<Action>, drop: MineDrop) {
  switch (drop.kind) {
    case 'ore':
      dispatch({ type: 'ADD_ORE', ore: drop.ore })
      break
    case 'nugget':
      dispatch({ type: 'ADD_NUGGET', nugget: drop.nugget })
      break
    case 'rough-stone':
      dispatch({ type: 'ADD_ROUGH_STONE', stone: drop.stone })
      break
    case 'gem':
      dispatch({ type: 'ADD_GEM', gem: drop.gem })
      break
    default:
      break
  }
}

export default function ChestLootScene({
  chest,
  area,
  state,
  dispatch,
  onClose,
  onUpdateChest,
}: Props) {
  const { showToast } = useToast()
  const loot = chest.remainingLoot
  const matCap = state.inventoryCapacity.materials
  const matCount = materialsCount(state)
  const firstOpenDone = useRef(false)

  useEffect(() => {
    if (chest.opened || firstOpenDone.current) return
    firstOpenDone.current = true
    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.rockBroken })
    playRockBreak()
    const bonusEss = rollBonusMineEssence(area, state.activeEffects, state.activeCharms)
    if (bonusEss) {
      dispatch({ type: 'ADD_ESSENCE', essenceId: bonusEss, quantity: 1 })
      playEssenceFound()
      const ess = getEssenceDef(bonusEss)
      showToast(`✨ ${ess?.name ?? 'Essens'} fra kisten!`, 'success', 4500)
    }
    onUpdateChest(chest.id, loot, true)
  }, [area, chest.id, chest.opened, dispatch, loot, onUpdateChest, showToast, state.activeEffects, state.activeCharms])

  const handleGold = () => {
    if (loot.gold <= 0) return
    dispatch({ type: 'EARN_GOLD', amount: loot.gold })
    onUpdateChest(chest.id, { ...loot, gold: 0 }, true)
  }

  const handleItem = (idx: number, drop: MineDrop) => {
    const extra = extraMaterialsFromDrop(drop)
    if (matCount + extra > matCap) return
    applyDrop(dispatch, drop)
    const items = loot.items.filter((_, i) => i !== idx)
    onUpdateChest(chest.id, { ...loot, items }, true)
  }

  const handleBlueprint = () => {
    const id = loot.blueprintId
    if (!id) return
    const def = findBlueprint(id)
    if (!state.unlockedBlueprints.includes(id)) {
      dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: id })
      showToast(`📜 Blueprint: ${def?.name ?? id}`, 'success', 5500)
    } else {
      showToast(`${def?.name ?? id} — du har allerede denne blueprint.`, 'info', 4000)
    }
    onUpdateChest(chest.id, { ...loot, blueprintId: null }, true)
  }

  const takeAll = () => {
    let cur = matCount
    let remaining: ChestLootResult = { ...loot }
    if (remaining.gold > 0) {
      dispatch({ type: 'EARN_GOLD', amount: remaining.gold })
      remaining = { ...remaining, gold: 0 }
    }
    const nextItems: MineDrop[] = []
    for (const d of remaining.items) {
      const need = extraMaterialsFromDrop(d)
      if (cur + need <= matCap) {
        applyDrop(dispatch, d)
        cur += need
      } else {
        nextItems.push(d)
      }
    }
    let bp = remaining.blueprintId
    if (bp) {
      const def = findBlueprint(bp)
      if (!state.unlockedBlueprints.includes(bp)) {
        dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: bp })
        showToast(`📜 Blueprint: ${def?.name ?? bp}`, 'success', 5500)
      }
      bp = null
    }
    onUpdateChest(chest.id, { ...remaining, items: nextItems, blueprintId: bp }, true)
  }

  const empty = loot.gold <= 0 && loot.items.length === 0 && !loot.blueprintId

  const tierLabel =
    chest.tier === 'wood' ? 'Træ kiste' : chest.tier === 'silver' ? 'Sølv kiste' : 'Guld kiste'

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 py-6 pointer-events-auto"
      role="dialog"
      aria-modal
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-950/95 shadow-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span>✨</span> {tierLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
          >
            ✕ Luk
          </button>
        </div>

        {empty ? (
          <p className="text-slate-300 text-sm py-6 text-center">Kisten er tom.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {loot.gold > 0 && (
              <ChestLootCard kind="gold" goldAmount={loot.gold} disabled={false} onTake={handleGold} />
            )}
            {loot.items.map((d, idx) => {
              const extra = extraMaterialsFromDrop(d)
              const full = matCount + extra > matCap
              return (
                <ChestLootCard
                  key={idx}
                  kind="item"
                  drop={d}
                  disabled={full}
                  disabledReason={full ? 'Lager fuldt' : undefined}
                  onTake={() => handleItem(idx, d)}
                />
              )
            })}
            {loot.blueprintId && (
              <ChestLootCard
                kind="blueprint"
                name={findBlueprint(loot.blueprintId)?.name ?? loot.blueprintId}
                disabled={false}
                onTake={handleBlueprint}
              />
            )}
          </div>
        )}

        {!empty && (
          <button
            type="button"
            onClick={takeAll}
            className="w-full min-h-[48px] rounded-xl bg-amber-800/80 hover:bg-amber-700/90 text-amber-50 font-semibold text-sm border border-amber-600/50"
          >
            Tag alt muligt
          </button>
        )}

        {empty && (
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold"
          >
            Luk
          </button>
        )}
      </div>
    </div>
  )
}
