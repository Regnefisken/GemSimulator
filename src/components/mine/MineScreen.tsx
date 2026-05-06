import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import type { Area, GameState, MetalName, RockEvent } from '../../types'
import { getCaveConfig } from '../../types'
import type { Action } from '../../lib/gameState'
import { materialsCount } from '../../lib/gameState'
import { XP_REWARDS } from '../../lib/leveling'
import {
  rockHpForDepth,
  rollBonusMineEssence,
  rollChestLoot,
  rollMineDrop,
  rollRockEvent,
  type MineDrop,
} from '../../gem/mining'
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
import {
  explodeDropToEntities,
  type WorldLootEntity,
} from '../../lib/lootEntities'
import type { WorldChestEntity } from './3d/WorldChest'

const MAX_WORLD_LOOT = 48
const MAX_WORLD_CHESTS = 6

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
    default:
      return undefined
  }
}

export default function MineScreen({ area, state, dispatch, onBack }: Props) {
  const { showToast } = useToast()
  const pickaxe = state.pickaxes.find((p) => p.id === state.activePickaxeId) ?? state.pickaxes[0]
  const [rockHp, setRockHp] = useState(0)
  const [maxHp, setMaxHp] = useState(0)
  const [hitPulse, setHitPulse] = useState(0)
  const [floaters, setFloaters] = useState<DamageFloater[]>([])
  const [dropNotice, setDropNotice] = useState<DropNotice | null>(null)
  const [rockEvent, setRockEvent] = useState<RockEvent>(() => rollRockEvent(area))
  const [entered, setEntered] = useState(false)
  const [swingTrigger, setSwingTrigger] = useState(0)
  const [lootEntities, setLootEntities] = useState<WorldLootEntity[]>([])
  const [worldChests, setWorldChests] = useState<WorldChestEntity[]>([])
  const [activeChestId, setActiveChestId] = useState<string | null>(null)
  const [crosshairMining, setCrosshairMining] = useState(false)
  const [crosshairOnTarget, setCrosshairOnTarget] = useState(false)
  /** Felter der lige er hugget ud — ingen rest-geometri under verdens-loot */
  const [depletedSlots, setDepletedSlots] = useState(() => new Set<number>())

  const noticeId = useRef(0)
  const hitId = useRef(0)
  const chestSpawnSig = useRef<string | null>(null)

  const phoenixQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.phoenixAsh)?.quantity ?? 0
  const slumberQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.slumberPowder)?.quantity ?? 0
  const moonBuffActive = state.activeEffects.some(
    (e) => e.id === MOON_TEAR_EFFECT_ID && (e.expiresAt == null || e.expiresAt > Date.now()),
  )

  const essenceTotal = state.essences.reduce((s, e) => s + e.quantity, 0)
  const cfgSlots = getCaveConfig(area).oreSlots.length
  const domMetal = dominantMetal(area)

  /** Når dybden skifter, er det aktive felt en ny klippe — fjern fra “hugget ud” */
  useLayoutEffect(() => {
    if (cfgSlots <= 0) return
    const active = state.depth % cfgSlots
    setDepletedSlots((prev) => {
      const next = new Set(prev)
      next.delete(active)
      return next
    })
  }, [state.depth, cfgSlots])

  useLayoutEffect(() => {
    setEntered(false)
    const t = window.setTimeout(() => setEntered(true), 50)
    return () => window.clearTimeout(t)
  }, [area.id])

  useLayoutEffect(() => {
    const event = rollRockEvent(area)
    setRockEvent(event)
    if (event.type !== 'chest') {
      const max = Math.floor(rockHpForDepth(state.depth, area) * event.hpMultiplier)
      setMaxHp(max)
      setRockHp(max)
    } else {
      setMaxHp(0)
      setRockHp(0)
    }
  }, [state.depth, area])

  useEffect(() => {
    if (rockEvent.type !== 'chest') {
      chestSpawnSig.current = null
      return
    }
    const tier = rockEvent.chestTier ?? 'wood'
    const sig = `${area.id}:${state.depth}:${tier}`
    if (chestSpawnSig.current === sig) return
    chestSpawnSig.current = sig

    const cave = getCaveConfig(area)
    const pos = cave.oreSlots[state.depth % cave.oreSlots.length] as [number, number, number]
    const loot = rollChestLoot(area, state.depth, tier, state.activeCharms)
    const id = `wc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setWorldChests((prev) => {
      let next = [...prev, { id, position: pos, tier, remainingLoot: loot, opened: false }]
      while (next.length > MAX_WORLD_CHESTS) {
        next.shift()
        showToast('For mange kister i grotten — den ældste smuldrede bort.', 'info')
      }
      return next
    })
    dispatch({ type: 'INCREMENT_DEPTH' })
  }, [rockEvent.type, rockEvent.chestTier, area, state.depth, state.activeCharms, dispatch, showToast])

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

  const handleUpdateChest = useCallback((id: string, remaining: import('../../gem/mining').ChestLootResult, opened: boolean) => {
    setWorldChests((prev) =>
      prev.map((c) => (c.id === id ? { ...c, remainingLoot: remaining, opened: opened || c.opened } : c)),
    )
  }, [])

  const handleMineHit = useCallback(() => {
    if (rockEvent.type === 'chest') return
    if (!pickaxe || pickaxe.durability <= 0) {
      showToast('Hakken er slidt op! Gå til smedjen og reparér den på reparationsbænken.')
      return
    }

    const useDynamite = state.instantBreakNextRock
    const isCrit = !useDynamite && Math.random() < 0.1
    const dmg = useDynamite ? rockHp : isCrit ? pickaxe.damage * 2 : pickaxe.damage

    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.mineHit })
    dispatch({ type: 'DAMAGE_PICKAXE', amount: 1 })
    playMineHit()
    if (useDynamite) dispatch({ type: 'CONSUME_DYNAMITE' })
    setHitPulse((n) => n + 1)
    setSwingTrigger((n) => n + 1)
    setCrosshairMining(true)
    window.setTimeout(() => setCrosshairMining(false), 140)
    pushFloater({ value: dmg, isCrit })

    const nextHp = rockHp - dmg
    if (nextHp > 0) {
      setRockHp(nextHp)
      return
    }

    setRockHp(0)
    playRockBreak()
    const cave = getCaveConfig(area)
    const brokenSlot = state.depth % cave.oreSlots.length
    setDepletedSlots((prev) => new Set(prev).add(brokenSlot))
    const drop = rollMineDrop(area, state.depth, state.activeCharms, rockEvent.type)
    const origin = cave.oreSlots[brokenSlot] as [number, number, number]

    if (drop.kind !== 'nothing') {
      const entities = explodeDropToEntities(drop, origin)
      if (entities.length > 0) {
        const overflow = Math.max(0, lootEntities.length + entities.length - MAX_WORLD_LOOT)
        setLootEntities((prev) => {
          let next = [...prev, ...entities]
          while (next.length > MAX_WORLD_LOOT) next.shift()
          return next
        })
        if (overflow > 0) {
          pushFloater({
            text: 'Loot blev til støv (grænse)',
            color: '#a8a29e',
          })
        }
      }
    }

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

    dispatch({ type: 'INCREMENT_DEPTH' })
    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.rockBroken })
  }, [
    rockEvent,
    pickaxe,
    rockHp,
    area,
    state.depth,
    state.activeCharms,
    state.activeEffects,
    state.instantBreakNextRock,
    dispatch,
    lootEntities,
    pushFloater,
    showToast,
  ])

  const mineDisabled = !pickaxe || pickaxe.durability <= 0 || rockEvent.type === 'chest'

  const activeChest = activeChestId ? worldChests.find((c) => c.id === activeChestId) : null

  const crosshairState = crosshairMining ? 'swing' : crosshairOnTarget ? 'hover-active' : 'normal'

  return (
    <div
      className={`relative w-full h-[100dvh] min-h-0 flex flex-col bg-slate-950 transition-opacity duration-500 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 z-0 min-h-0">
        <MiningCave3D
          className="h-full min-h-0 rounded-none border-0 bg-transparent"
          canvasClassName="w-full h-full min-h-[320px] touch-none cursor-crosshair"
          area={area}
          hp={rockHp}
          maxHp={maxHp}
          hitPulse={hitPulse}
          rockType={rockEvent.type !== 'chest' ? rockEvent.type : 'normal'}
          disabled={mineDisabled}
          depth={state.depth}
          depletedSlots={depletedSlots}
          onMineHit={handleMineHit}
          swingTrigger={swingTrigger}
          pickaxePixelItem={pickaxe?.pixelItem ?? null}
          lootEntities={lootEntities}
          onCollectLoot={handleCollectLoot}
          worldChests={worldChests}
          onChestClick={(id) => setActiveChestId(id)}
          onCrosshairTargetChange={setCrosshairOnTarget}
        />
      </div>

      <Crosshair state={crosshairState} />

      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col min-h-0">
        <div className="pointer-events-auto shrink-0">
          <HUDTopBar
            className="shrink-0"
            onBack={onBack}
            depth={state.depth}
            essenceCount={essenceTotal}
            areaLabel={`${area.icon} ${area.name}`}
          />
        </div>
        <HUDHpBar
          className="pointer-events-none shrink-0"
          visible={rockEvent.type !== 'chest'}
          hp={rockHp}
          maxHp={maxHp}
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
          rockType={rockEvent.type !== 'chest' ? rockEvent.type : undefined}
          chestTier={rockEvent.type === 'chest' ? (rockEvent.chestTier ?? 'wood') : undefined}
        >
          <MinimapHUD slotCount={cfgSlots} activeIndex={state.depth} dominantMetal={domMetal} />
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
