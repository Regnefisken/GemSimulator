import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import type { Area, GameState, MetalName } from '../../types'
import { getCaveConfig } from '../../types'
import type { Action } from '../../lib/gameState'
import { materialsCount } from '../../lib/gameState'
import { XP_REWARDS } from '../../lib/leveling'
import {
  rollBonusMineEssence,
  rollCoalDrop,
  rollMineDrop,
  type MineDrop,
} from '../../gem/mining'
import { canDescendFromLayer } from '../../gem/mineLayer'
import { ESSENCE_IDS, getEssenceDef, MOON_TEAR_EFFECT_ID } from '../../data/essences'
import { METALS } from '../../data/metals'
import { playEssenceFound, playGemFound, playMineHit, playRockBreak } from '../../lib/sounds'
import { useToast } from '../ui/ToastContext'
import MiningCave3D from './3d/MiningCave3D'
import DamageNumbers, { type DamageFloater } from './DamageNumbers'
import { HUDHpBar, HUDBottomBar, HUDTopBar } from './MineHUD'
import MinimapHUD from './MinimapHUD'
import RockDropBanner, { type DropNotice } from './RockDropBanner'
import Crosshair from './Crosshair'
import ChestLootScene from './ChestLootScene'
import { explodeDropToEntities, type WorldLootEntity } from '../../lib/lootEntities'
import type { WorldChestEntity } from './3d/WorldChest'

const MAX_WORLD_LOOT = 48

type Props = {
  area: Area
  state: GameState
  dispatch: Dispatch<Action>
  onBack: () => void
}

function dominantMetal(area: Area): MetalName | undefined {
  const pool = area.metalPool
  if (!pool?.length) return undefined
  return [...pool].sort((a, b) => b.weight - a.weight)[0]?.metal
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
    default:
      return 0
  }
}

function dropPickupLabel(drop: MineDrop): string {
  switch (drop.kind) {
    case 'ore':
      return `+1 ${drop.ore.metalName} malm`
    case 'nugget':
      return `+1 ${drop.nugget.metalName} klump`
    case 'rough-stone':
      return '+1 Rå klippe'
    case 'gem':
      return `+1 ${drop.gem.name}`
    case 'coal':
      return `+${drop.quantity} Kul`
    default:
      return '+1'
  }
}

function pickupAccent(drop: MineDrop): string | undefined {
  switch (drop.kind) {
    case 'ore':
      return METALS[drop.ore.metalName]?.pixelColor
    case 'nugget':
      return METALS[drop.nugget.metalName]?.pixelColor
    case 'rough-stone':
      return '#94a3b8'
    case 'gem':
      return drop.gem.colorMap['G']
    case 'coal':
      return '#57534e'
    default:
      return undefined
  }
}

export default function MineScreen({ area, state, dispatch, onBack }: Props) {
  const { showToast } = useToast()
  const pickaxe = state.pickaxes.find((p) => p.id === state.activePickaxeId) ?? state.pickaxes[0]
  const [hitPulse, setHitPulse] = useState(0)
  const [floaters, setFloaters] = useState<DamageFloater[]>([])
  const [dropNotice, setDropNotice] = useState<DropNotice | null>(null)
  const [entered, setEntered] = useState(false)
  const [swingTrigger, setSwingTrigger] = useState(0)
  const [lootEntities, setLootEntities] = useState<WorldLootEntity[]>([])
  const [activeChestId, setActiveChestId] = useState<string | null>(null)
  const [crosshairMining, setCrosshairMining] = useState(false)
  const [crosshairOnTarget, setCrosshairOnTarget] = useState(false)

  const noticeId = useRef(0)
  const hitId = useRef(0)

  const phoenixQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.phoenixAsh)?.quantity ?? 0
  const slumberQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.slumberPowder)?.quantity ?? 0
  const moonBuffActive = state.activeEffects.some(
    (e) => e.id === MOON_TEAR_EFFECT_ID && (e.expiresAt == null || e.expiresAt > Date.now()),
  )

  const essenceTotal = state.essences.reduce((s, e) => s + e.quantity, 0)
  const cfgSlots = getCaveConfig(area).oreSlots.length
  const domMetal = dominantMetal(area)

  const run = state.mineRun

  useEffect(() => {
    if (area.kind !== 'mine') return
    if (state.mineRun?.mineId !== area.id) {
      dispatch({ type: 'MINE_RUN_ENTER', mineId: area.id })
    }
  }, [area.id, area.kind, state.mineRun?.mineId, dispatch])

  /** Nyt lag ved hvert besøg: smid run når minen forlades (undgår genbrug af gamle slots). */
  useEffect(() => {
    return () => {
      dispatch({ type: 'MINE_RUN_EXIT' })
    }
  }, [dispatch])

  useLayoutEffect(() => {
    setEntered(false)
    const t = window.setTimeout(() => setEntered(true), 50)
    return () => window.clearTimeout(t)
  }, [area.id])

  /** Nyt lag: ryd verdens-loot (samles før ned via handleDescend). */
  useEffect(() => {
    setLootEntities([])
    setActiveChestId(null)
  }, [run?.currentDepth, run?.runId])

  const worldChests: WorldChestEntity[] = useMemo(() => {
    if (!run || run.mineId !== area.id) return []
    const cave = getCaveConfig(area)
    const out: WorldChestEntity[] = []
    for (let i = 0; i < run.slots.length; i++) {
      const s = run.slots[i]
      if (s.kind !== 'chest' || s.cleared || !s.chestEntityId || !s.chestLoot) continue
      out.push({
        id: s.chestEntityId,
        slotIndex: i,
        position: cave.oreSlots[i] as [number, number, number],
        tier: s.chestTier ?? 'wood',
        remainingLoot: s.chestLoot,
        opened: s.chestOpened ?? false,
      })
    }
    return out
  }, [run, area])

  const depletedSlots = useMemo(() => {
    if (!run) return new Set<number>()
    const s = new Set<number>()
    run.slots.forEach((slot, i) => {
      if (slot.kind === 'rock' && slot.cleared) s.add(i)
    })
    return s
  }, [run])

  const targetIdx = run?.targetSlotIndex ?? 0
  const activeSlot = run?.slots[targetIdx]
  const runDepth = run?.currentDepth ?? 0

  const pushFloater = useCallback((opts: {
    value?: number
    isCrit?: boolean
    text?: string
    color?: string
  }) => {
    const id = hitId.current++
    const left = `${42 + Math.random() * 16}%`
    const top = `${38 + Math.random() * 12}%`
    setFloaters((prev) => [
      ...prev,
      {
        id,
        value: opts.value,
        left,
        top,
        isCrit: opts.isCrit,
        text: opts.text,
        color: opts.color,
      },
    ])
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id))
    }, opts.text ? 900 : opts.isCrit ? 900 : 600)
  }, [])

  const applyDrop = useCallback(
    (drop: MineDrop) => {
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
        default:
          break
      }
    },
    [dispatch],
  )

  const matCount = materialsCount(state)
  const matCap = state.inventoryCapacity.materials

  const handleCollectLoot = useCallback(
    (entityId: string) => {
      const entity = lootEntities.find((e) => e.id === entityId)
      if (!entity || entity.collected) return
      const extra = extraMaterialsFromDrop(entity.drop)
      if (matCount + extra > matCap) {
        pushFloater({
          text: 'Lager fuldt!',
          color: '#fbbf24',
        })
        return
      }
      applyDrop(entity.drop)
      setLootEntities((prev) => prev.filter((e) => e.id !== entityId))
      pushFloater({
        text: dropPickupLabel(entity.drop),
        color: pickupAccent(entity.drop) ?? '#86efac',
      })
    },
    [lootEntities, matCount, matCap, applyDrop, pushFloater],
  )

  const handleUpdateChest = useCallback(
    (chestId: string, remaining: import('../../gem/mining').ChestLootResult, opened: boolean) => {
      const chest = worldChests.find((c) => c.id === chestId)
      if (!chest) return
      dispatch({
        type: 'MINE_UPDATE_CHEST_SLOT',
        slotIndex: chest.slotIndex,
        loot: remaining,
        opened: opened || undefined,
      })
    },
    [worldChests, dispatch],
  )

  const handleDescend = useCallback(() => {
    if (!run) return
    if (!canDescendFromLayer(run.slots)) {
      showToast('Ryd alle felter (inkl. kister) før du går dybere.', 'info')
      return
    }
    let used = matCount
    for (const e of lootEntities) {
      const extra = extraMaterialsFromDrop(e.drop)
      if (used + extra <= matCap) {
        applyDrop(e.drop)
        used += extra
      }
    }
    setLootEntities([])
    dispatch({ type: 'MINE_DESCEND_LAYER' })
    showToast(`Ned til dybde ${run.currentDepth + 1}`, 'success', 2200)
  }, [run, lootEntities, matCount, matCap, applyDrop, dispatch, showToast])

  const handleMineHit = useCallback(() => {
    if (!run || !activeSlot || activeSlot.kind !== 'rock' || activeSlot.cleared) return
    if (!pickaxe || pickaxe.durability <= 0) {
      showToast('Hakken er slidt op! Gå til smedjen og reparér den på reparationsbænken.')
      return
    }

    const useDynamite = state.instantBreakNextRock
    const isCrit = !useDynamite && Math.random() < 0.1
    const dmg = useDynamite ? activeSlot.currentHp : isCrit ? pickaxe.damage * 2 : pickaxe.damage

    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.mineHit })
    dispatch({ type: 'DAMAGE_PICKAXE', amount: 1 })
    playMineHit()
    if (useDynamite) dispatch({ type: 'CONSUME_DYNAMITE' })
    setHitPulse((n) => n + 1)
    setSwingTrigger((n) => n + 1)
    setCrosshairMining(true)
    window.setTimeout(() => setCrosshairMining(false), 140)
    pushFloater({ value: dmg, isCrit })

    const nextHp = Math.max(0, activeSlot.currentHp - dmg)
    const cave = getCaveConfig(area)
    const brokenSlot = targetIdx

    if (nextHp > 0) {
      dispatch({ type: 'MINE_DEAL_DAMAGE', slotIndex: brokenSlot, damage: dmg })
      return
    }

    const drop = rollMineDrop(area, runDepth, state.activeCharms, activeSlot.rockType)
    const coalDrop = rollCoalDrop(runDepth)
    const origin = cave.oreSlots[brokenSlot] as [number, number, number]

    if (drop.kind !== 'nothing') {
      const entities = explodeDropToEntities(drop, origin)
      if (entities.length > 0) {
        setLootEntities((prev) => {
          const overflow = Math.max(0, prev.length + entities.length - MAX_WORLD_LOOT)
          let next = [...prev, ...entities]
          while (next.length > MAX_WORLD_LOOT) next.shift()
          if (overflow > 0) {
            pushFloater({
              text: 'Loot blev til støv (grænse)',
              color: '#a8a29e',
            })
          }
          return next
        })
      }
    }

    if (coalDrop) {
      const coalEnts = explodeDropToEntities(coalDrop, origin)
      setLootEntities((prev) => {
        let next = [...prev, ...coalEnts]
        while (next.length > MAX_WORLD_LOOT) next.shift()
        return next
      })
    }

    dispatch({ type: 'MINE_DEAL_DAMAGE', slotIndex: brokenSlot, damage: dmg })

    const bonusEss = rollBonusMineEssence(area, state.activeEffects, state.activeCharms)
    if (bonusEss) {
      dispatch({ type: 'ADD_ESSENCE', essenceId: bonusEss, quantity: 1 })
      playEssenceFound()
    }
    const ess = bonusEss ? getEssenceDef(bonusEss) : null
    setDropNotice({
      id: noticeId.current++,
      drop,
      essenceId: bonusEss ?? null,
      essenceName: ess?.name ?? null,
    })
    if (drop.kind === 'gem') playGemFound()

    playRockBreak()
    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.rockBroken })
  }, [
    run,
    activeSlot,
    pickaxe,
    area,
    runDepth,
    targetIdx,
    state.activeCharms,
    state.activeEffects,
    state.instantBreakNextRock,
    dispatch,
    pushFloater,
    showToast,
  ])

  const mineDisabled =
    !pickaxe ||
    pickaxe.durability <= 0 ||
    !activeSlot ||
    activeSlot.kind !== 'rock' ||
    activeSlot.cleared

  const activeChest = activeChestId ? worldChests.find((c) => c.id === activeChestId) : null

  const crosshairState = crosshairMining ? 'swing' : crosshairOnTarget ? 'hover-active' : 'normal'

  const hudRockType = activeSlot?.kind === 'rock' ? activeSlot.rockType : undefined
  const hudChestTier =
    activeSlot?.kind === 'chest' ? (activeSlot.chestTier ?? 'wood') : undefined

  if (!run || run.mineId !== area.id) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-950 text-slate-300 text-sm">
        Indlæser mine…
      </div>
    )
  }

  return (
    <div
      className={`relative w-full h-[100dvh] min-h-0 flex flex-col bg-slate-950 transition-opacity duration-500 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 z-0 min-h-0">
        <MiningCave3D
          key={`${area.id}-${run.runId}-${run.currentDepth}`}
          className="h-full min-h-0 rounded-none border-0 bg-transparent"
          canvasClassName="w-full h-full min-h-[320px] touch-none cursor-crosshair"
          area={area}
          mineSlots={run.slots}
          runDepth={runDepth}
          targetSlotIndex={targetIdx}
          hitPulse={hitPulse}
          disabled={mineDisabled}
          onMineHit={handleMineHit}
          swingTrigger={swingTrigger}
          pickaxePixelItem={pickaxe?.pixelItem ?? null}
          lootEntities={lootEntities}
          depletedSlots={depletedSlots}
          onCollectLoot={handleCollectLoot}
          worldChests={worldChests}
          onChestClick={(id) => setActiveChestId(id)}
          onCrosshairTargetChange={setCrosshairOnTarget}
          onSelectMineSlot={(i) => dispatch({ type: 'MINE_SET_TARGET_SLOT', index: i })}
        />
      </div>

      <Crosshair state={crosshairState} />

      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col min-h-0">
        <div className="pointer-events-auto shrink-0">
          <HUDTopBar
            className="shrink-0"
            onBack={onBack}
            depth={runDepth}
            essenceCount={essenceTotal}
            areaLabel={`${area.icon} ${area.name}`}
          />
        </div>
        <HUDHpBar
          className="pointer-events-none shrink-0"
          visible={activeSlot?.kind === 'rock' && !activeSlot.cleared}
          hp={activeSlot?.kind === 'rock' ? activeSlot.currentHp : 0}
          maxHp={activeSlot?.kind === 'rock' ? activeSlot.maxHp : 1}
        />
        <div className="flex-1 min-h-0" />

        <HUDBottomBar
          className="shrink-0"
          pickaxeName={pickaxe?.name ?? '—'}
          durability={pickaxe?.durability ?? 0}
          maxDurability={pickaxe?.maxDurability ?? 1}
          dynamiteReady={state.instantBreakNextRock}
          matCount={matCount}
          matCap={matCap}
          rockType={hudRockType}
          chestTier={hudChestTier}
        >
          <div className="flex flex-col items-end gap-2">
            {canDescendFromLayer(run.slots) && (
              <button
                type="button"
                onClick={handleDescend}
                className="min-h-[40px] px-3 rounded-lg bg-emerald-900/70 border border-emerald-600/50 text-emerald-100 text-xs font-semibold hover:bg-emerald-800/70 pointer-events-auto"
              >
                Ned til næste lag
              </button>
            )}
            <MinimapHUD
              slotCount={cfgSlots}
              activeIndex={targetIdx}
              dominantMetal={domMetal}
              onSlotSelect={(i) => dispatch({ type: 'MINE_SET_TARGET_SLOT', index: i })}
            />
          </div>
        </HUDBottomBar>
      </div>

      <div className="pointer-events-none absolute inset-0 z-40">
        <DamageNumbers items={floaters} />
        {dropNotice && (
          <RockDropBanner
            key={dropNotice.id}
            notice={dropNotice}
            onDone={() => setDropNotice(null)}
          />
        )}
      </div>

      {pickaxe && pickaxe.durability === 0 && (
        <div
          className="pointer-events-auto absolute bottom-36 left-3 right-3 z-50 rounded-xl border border-amber-700/50 bg-amber-950/90 px-4 py-3 text-sm text-amber-100/95"
          role="status"
        >
          🔨 Din hakke er slidt op. Gå til <strong className="text-amber-50">smedjen</strong> på kortet og reparér den på
          reparationsbænken.
        </div>
      )}

      {(moonBuffActive || phoenixQ > 0 || slumberQ > 0) && (
        <div className="pointer-events-auto absolute top-28 left-3 right-3 z-50 rounded-xl border border-slate-600 bg-slate-900/95 px-4 py-3 text-sm space-y-2">
          {moonBuffActive && (
            <p className="text-cyan-300/95">🌙 Måne-buff aktiv — øget chance for essens-drops.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {phoenixQ > 0 && (
              <button
                type="button"
                disabled={!pickaxe}
                onClick={() => dispatch({ type: 'USE_ESSENCE_MINE', essenceId: ESSENCE_IDS.phoenixAsh })}
                className="min-h-[40px] px-3 rounded-lg bg-rose-900/60 border border-rose-600/50 text-rose-100 text-xs font-semibold hover:bg-rose-800/60 disabled:opacity-40"
              >
                Fønix-Aske ({phoenixQ}) — fuld repair +5 max
              </button>
            )}
            {slumberQ > 0 && (
              <button
                type="button"
                disabled={!pickaxe}
                onClick={() => dispatch({ type: 'USE_ESSENCE_MINE', essenceId: ESSENCE_IDS.slumberPowder })}
                className="min-h-[40px] px-3 rounded-lg bg-indigo-900/50 border border-indigo-600/50 text-indigo-100 text-xs font-semibold hover:bg-indigo-800/50 disabled:opacity-40"
              >
                Dvalepulver ({slumberQ}) — +25% max som holdbarhed
              </button>
            )}
          </div>
        </div>
      )}

      {activeChest && (
        <ChestLootScene
          chest={activeChest}
          area={area}
          state={state}
          dispatch={dispatch}
          onClose={() => setActiveChestId(null)}
          onUpdateChest={handleUpdateChest}
        />
      )}
    </div>
  )
}
