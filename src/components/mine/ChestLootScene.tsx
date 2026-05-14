import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import type { Area, GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import {
  materialsCount,
  canAddConsumableUnits,
  CONSUMABLE_BAG_MAX,
  totalConsumableQty,
} from '../../lib/gameState'
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
import { CHEST_TIER_NAME_DK } from '../../lib/chestTierUi'
import ChestLootCard from './ChestLootCard'
import type { WorldChestEntity } from './3d/WorldChest'

/** Værste grid: guld-kort + max `items` (6 base + ingrediens + ekstra bp i liste + forbruger) + separat `blueprintId` — hold synk med `rollChestLoot` (gold tier). */
export const CHEST_GRID_SLOT_CAP = 11
/** Kolonner ved default (mobil); bruges til max rækker for scroll-højde. */
export const CHEST_GRID_COLS_BASE = 2
export const CHEST_GRID_COLS_SM = 3
export const CHEST_GRID_MAX_ROWS = Math.ceil(CHEST_GRID_SLOT_CAP / CHEST_GRID_COLS_BASE)

/** Matcher `ChestLootCard` min-h + `gap-3` i grid. */
const CHEST_LOOT_CARD_MIN_HEIGHT_PX = 120
const CHEST_GRID_GAP_PX = 12

function chestGridScrollBodyMaxHeightPx(): number {
  const rows = CHEST_GRID_MAX_ROWS
  return rows * CHEST_LOOT_CARD_MIN_HEIGHT_PX + (rows - 1) * CHEST_GRID_GAP_PX
}

export function isChestLootEmpty(remaining: ChestLootResult): boolean {
  return remaining.gold <= 0 && remaining.items.length === 0 && !remaining.blueprintId
}

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
    case 'gem':
      return 1
    case 'coal':
      return drop.quantity
    case 'consumable':
    case 'blueprint':
    case 'loot_pickaxe':
    case 'loot_sword':
    case 'loot_armour':
      return 0
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
    case 'coal':
      dispatch({ type: 'ADD_COAL', amount: drop.quantity })
      break
    case 'consumable':
      dispatch({ type: 'ADD_CONSUMABLE', consumableId: drop.consumableId, quantity: drop.quantity })
      break
    case 'blueprint':
      dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: drop.blueprintId })
      break
    case 'loot_pickaxe':
      dispatch({
        type: 'RUN_APPEND_FOUND_LOOT',
        entry: { kind: 'pickaxe_gear', pickaxe: drop.pickaxe, origin: 'mine' },
      })
      break
    case 'loot_sword':
      dispatch({
        type: 'RUN_APPEND_FOUND_LOOT',
        entry: { kind: 'sword_gear', sword: drop.sword, origin: 'mine' },
      })
      break
    case 'loot_armour':
      dispatch({
        type: 'RUN_APPEND_FOUND_LOOT',
        entry: { kind: 'armour_gear', armour: drop.armour, origin: 'mine' },
      })
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
  const lootRef = useRef(loot)
  lootRef.current = loot

  /** Stabile keys: `filter` bevarer MineDrop-objektreferencer, så WeakMap undgår remount pr. klik. */
  const itemRowKeyMap = useRef(new WeakMap<MineDrop, string>())
  const itemRowKeySerial = useRef(0)
  const prevChestIdRef = useRef(chest.id)
  if (prevChestIdRef.current !== chest.id) {
    prevChestIdRef.current = chest.id
    itemRowKeyMap.current = new WeakMap()
    itemRowKeySerial.current = 0
  }
  const rowKeyForDrop = (drop: MineDrop) => {
    const m = itemRowKeyMap.current
    let k = m.get(drop)
    if (!k) {
      k = `${chest.id}-${itemRowKeySerial.current++}`
      m.set(drop, k)
    }
    return k
  }

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    document.exitPointerLock?.()
  }, [])

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
    onUpdateChest(chest.id, lootRef.current, true)
  }, [area, chest.id, chest.opened, dispatch, onUpdateChest, showToast, state.activeEffects, state.activeCharms])

  const handleGold = () => {
    if (loot.gold <= 0) return
    dispatch({ type: 'EARN_GOLD', amount: loot.gold })
    const next: ChestLootResult = { ...loot, gold: 0 }
    onUpdateChest(chest.id, next, true)
    if (isChestLootEmpty(next)) onClose()
  }

  const handleItem = (idx: number, drop: MineDrop) => {
    if (drop.kind === 'consumable') {
      if (!canAddConsumableUnits(state, drop.quantity)) return
      applyDrop(dispatch, drop)
    } else if (drop.kind === 'blueprint') {
      const id = drop.blueprintId
      const def = findBlueprint(id)
      if (!state.unlockedBlueprints.includes(id)) {
        dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: id })
        showToast(`📜 Blueprint: ${def?.name ?? id}`, 'success', 5500)
      } else {
        showToast(`${def?.name ?? id} — du har allerede denne blueprint.`, 'info', 4000)
      }
    } else if (drop.kind === 'loot_pickaxe' || drop.kind === 'loot_sword' || drop.kind === 'loot_armour') {
      applyDrop(dispatch, drop)
    } else {
      const extra = extraMaterialsFromDrop(drop)
      if (matCount + extra > matCap) return
      applyDrop(dispatch, drop)
    }
    const items = loot.items.filter((_, i) => i !== idx)
    const next: ChestLootResult = { ...loot, items }
    onUpdateChest(chest.id, next, true)
    if (isChestLootEmpty(next)) onClose()
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
    const next: ChestLootResult = { ...loot, blueprintId: null }
    onUpdateChest(chest.id, next, true)
    if (isChestLootEmpty(next)) onClose()
  }

  const takeAll = () => {
    let cur = matCount
    let remaining: ChestLootResult = { ...loot }
    if (remaining.gold > 0) {
      dispatch({ type: 'EARN_GOLD', amount: remaining.gold })
      remaining = { ...remaining, gold: 0 }
    }
    const nextItems: MineDrop[] = []
    let bagUsed = totalConsumableQty(state)
    for (const d of remaining.items) {
      if (d.kind === 'consumable') {
        if (bagUsed + d.quantity > CONSUMABLE_BAG_MAX) {
          nextItems.push(d)
          continue
        }
        applyDrop(dispatch, d)
        bagUsed += d.quantity
        continue
      }
      if (d.kind === 'blueprint') {
        const def = findBlueprint(d.blueprintId)
        if (!state.unlockedBlueprints.includes(d.blueprintId)) {
          dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: d.blueprintId })
          showToast(`📜 Blueprint: ${def?.name ?? d.blueprintId}`, 'success', 5500)
        }
        continue
      }
      if (d.kind === 'loot_pickaxe' || d.kind === 'loot_sword' || d.kind === 'loot_armour') {
        applyDrop(dispatch, d)
        continue
      }
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
    const next: ChestLootResult = { ...remaining, items: nextItems, blueprintId: bp }
    onUpdateChest(chest.id, next, true)
    if (isChestLootEmpty(next)) onClose()
  }

  const empty = isChestLootEmpty(loot)
  const gridScrollMaxPx = chestGridScrollBodyMaxHeightPx()
  const gridScrollStyle = {
    maxHeight: `min(${gridScrollMaxPx}px, calc(90dvh - 12rem))`,
  } as const

  const tierLabel = CHEST_TIER_NAME_DK[chest.tier]

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 py-4 sm:py-6 pointer-events-auto min-h-0"
      role="dialog"
      aria-modal
    >
      <div className="w-full max-w-lg max-h-[min(90dvh,90vh)] min-h-0 flex flex-col rounded-2xl border border-slate-600 bg-slate-950/95 shadow-2xl p-3 sm:p-4 gap-3 sm:gap-4 overflow-y-auto overflow-x-hidden">
        <div className="flex shrink-0 items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span>✨</span> {tierLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
          >
            ✕ Luk
          </button>
        </div>

        {empty ? (
          <p className="text-slate-300 text-sm py-6 text-center shrink-0">Kisten er tom.</p>
        ) : (
          <div
            className="min-h-0 w-full overflow-y-auto overscroll-contain pr-0.5 -mr-0.5"
            style={gridScrollStyle}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-min pb-0.5">
              {loot.gold > 0 && (
                <ChestLootCard
                  key={`gold-${chest.id}`}
                  kind="gold"
                  goldAmount={loot.gold}
                  disabled={false}
                  onTake={handleGold}
                />
              )}
              {loot.items.map((d, idx) => {
                const extra = extraMaterialsFromDrop(d)
                const isGear =
                  d.kind === 'loot_pickaxe' || d.kind === 'loot_sword' || d.kind === 'loot_armour'
                const matFull =
                  !isGear &&
                  d.kind !== 'consumable' &&
                  d.kind !== 'blueprint' &&
                  matCount + extra > matCap
                const bagFull = d.kind === 'consumable' && !canAddConsumableUnits(state, d.quantity)
                const full = matFull || bagFull
                const reason = bagFull ? 'Forbrugs-lager fuldt' : matFull ? 'Lager fuldt' : undefined
                return (
                  <ChestLootCard
                    key={rowKeyForDrop(d)}
                    kind="item"
                    drop={d}
                    disabled={full}
                    disabledReason={reason}
                    onTake={() => handleItem(idx, d)}
                  />
                )
              })}
              {loot.blueprintId && (
                <ChestLootCard
                  key={`bp-${loot.blueprintId}`}
                  kind="blueprint"
                  name={findBlueprint(loot.blueprintId)?.name ?? loot.blueprintId}
                  disabled={false}
                  onTake={handleBlueprint}
                />
              )}
            </div>
          </div>
        )}

        {!empty && (
          <button
            type="button"
            onClick={takeAll}
            className="w-full shrink-0 min-h-[48px] rounded-xl bg-amber-800/80 hover:bg-amber-700/90 text-amber-50 font-semibold text-sm border border-amber-600/50"
          >
            Tag alt
          </button>
        )}

        {empty && (
          <button
            type="button"
            onClick={onClose}
            className="w-full shrink-0 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold"
          >
            Luk
          </button>
        )}
      </div>
    </div>
  )
}
