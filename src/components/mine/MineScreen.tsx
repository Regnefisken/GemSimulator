import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import type { Area, GameState, MetalName } from '../../types'
import { getCaveConfig } from '../../types'
import { resolveEffectiveCaveConfig, getProceduralMineCaveSeed } from '../../gem/mineCaveContext'
import { GRAPHICS_PRESETS } from '../../gem/graphicsPresets'
import type { Action } from '../../lib/gameState'
import { materialsCount, canAddConsumableUnits, CONSUMABLE_BAG_MAX } from '../../lib/gameState'
import { XP_REWARDS } from '../../lib/leveling'
import {
  mobDamagePerTick,
  rollBonusMineEssence,
  rollCoalDrop,
  rollMineDrop,
  rollMobMineDrop,
  type MineDrop,
} from '../../gem/mining'
import { getRockLayoutParams } from '../../gem/procedural/rockLayout'
import { canDescendFromLayer } from '../../gem/mineLayer'
import { pickChestRotationY } from '../../gem/chestOrientation'
import { ESSENCE_IDS, getEssenceDef, MOON_TEAR_EFFECT_ID } from '../../data/essences'
import { findConsumableDef } from '../../data/consumables'
import { findBrew } from '../../data/brews'
import {
  effectiveTotalHpMax,
  effectiveTotalManaMax,
} from '../../lib/survival'
import { findBlueprint } from '../../data/blueprints'
import { METALS } from '../../data/metals'
import { getPlayableHalfExtents } from '../../lib/caveHalfExtents'
import { playEssenceFound, playGemFound, playMineHit, playRockBreak } from '../../lib/sounds'
import { useToast } from '../ui/ToastContext'
import { useGraphicsPreset } from '../../lib/useGraphicsPreset'
import MiningCave3D from './3d/MiningCave3D'
import { DEFAULT_SWORD_TRANSFORM } from './3d/pickaxeDefaults'
import WeaponFpsDevPanel, { pickaxeHeldDefault } from './WeaponFpsDevPanel'
import {
  lootScatterOriginWorldPosition,
  sinkOreSlotWorldPosition,
} from './sinkOreSlotPosition'
import DamageNumbers, { type DamageFloater } from './DamageNumbers'
import { HUDBottomBar, HUDPlayerSurvival, HUDTopBar, HUDWeaponToggle, HUDConsumableQuickBar } from './MineHUD'
import MinimapHUD from './MinimapHUD'
import RockDropBanner, { type DropNotice } from './RockDropBanner'
import Crosshair from './Crosshair'
import ChestLootScene from './ChestLootScene'
import MineRunLootPanel from './MineRunLootPanel'
import { explodeDropToEntities, type WorldLootEntity } from '../../lib/lootEntities'
import type { WorldChestEntity } from './3d/WorldChest'

const MAX_WORLD_LOOT = 48
const SWORD_HIT_DURABILITY_LOSS = 3

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
    case 'consumable': {
      const def = findConsumableDef(drop.consumableId)
      return `+${drop.quantity} ${def?.name ?? drop.consumableId}`
    }
    case 'blueprint': {
      const bp = findBlueprint(drop.blueprintId)
      return `📜 ${bp?.name ?? drop.blueprintId}`
    }
    case 'loot_pickaxe':
      return drop.pickaxe.name
    case 'loot_sword':
      return drop.sword.name
    case 'loot_armour':
      return drop.armour.name
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
    case 'consumable':
      return '#34d399'
    case 'blueprint':
      return '#a78bfa'
    case 'loot_pickaxe':
      return '#94a3b8'
    case 'loot_sword':
      return '#cbd5e1'
    case 'loot_armour':
      return '#78716c'
    default:
      return undefined
  }
}

export default function MineScreen({ area, state, dispatch, onBack }: Props) {
  const gameStateRef = useRef(state)
  gameStateRef.current = state

  const { showToast } = useToast()
  const pickaxe = state.pickaxes.find((p) => p.id === state.activePickaxeId) ?? state.pickaxes[0]
  const sword = state.swords.find((s) => s.id === state.activeSwordId) ?? state.swords[0]
  const [hitPulse, setHitPulse] = useState(0)
  const [floaters, setFloaters] = useState<DamageFloater[]>([])
  const [pickupFeed, setPickupFeed] = useState<{ id: number; text: string; color?: string } | null>(null)
  const [dropNotice, setDropNotice] = useState<DropNotice | null>(null)
  const [entered, setEntered] = useState(false)
  const [swingTrigger, setSwingTrigger] = useState(0)
  const [lootEntities, setLootEntities] = useState<WorldLootEntity[]>([])
  const [activeChestId, setActiveChestId] = useState<string | null>(null)
  const [crosshairMining, setCrosshairMining] = useState(false)
  const [crosshairOnTarget, setCrosshairOnTarget] = useState(false)
  const [mobCombatHint, setMobCombatHint] = useState(false)

  const weaponDevEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('weaponDev') === '1'

  const [devPick, setDevPick] = useState(() => pickaxeHeldDefault())
  const [devSword, setDevSword] = useState(() => ({ ...DEFAULT_SWORD_TRANSFORM }))
  const [devPickGlb, setDevPickGlb] = useState(0.44)
  const [devSwordGlb, setDevSwordGlb] = useState(0.52)

  /** Planær jagt-offset pr. slot (XZ) — synkron fra R3F mob; loot ved drab skal lande ved liget. */
  const mobPlanarOffsetRef = useRef<Record<number, [number, number]>>({})
  const reportMobPlanarOffset = useCallback((slotIndex: number, dx: number, dz: number) => {
    mobPlanarOffsetRef.current[slotIndex] = [dx, dz]
  }, [])

  const noticeId = useRef(0)
  const hitId = useRef(0)
  const pickupFeedClearRef = useRef<number | null>(null)
  /** Én toast pr. mål-slot pr. dybde/run (ingen fast mob-banner). */
  const mobCombatToastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (pickupFeedClearRef.current != null) {
        window.clearTimeout(pickupFeedClearRef.current)
      }
    }
  }, [])

  const phoenixQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.phoenixAsh)?.quantity ?? 0
  const slumberQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.slumberPowder)?.quantity ?? 0
  const moonBuffActive = state.activeEffects.some(
    (e) => e.id === MOON_TEAR_EFFECT_ID && (e.expiresAt == null || e.expiresAt > Date.now()),
  )

  const essenceTotal = state.essences.reduce((s, e) => s + e.quantity, 0)
  const activeBrew = useMemo(
    () => (state.activeBrewId ? findBrew(state.activeBrewId) : undefined),
    [state.activeBrewId],
  )
  const domMetal = dominantMetal(area)

  const run = state.mineRun

  const effectiveCaveConfig = useMemo(() => {
    if (!run || run.mineId !== area.id) return getCaveConfig(area)
    return resolveEffectiveCaveConfig({
      area,
      runId: run.runId,
      mineId: run.mineId,
      currentDepth: run.currentDepth,
    })
  }, [area, run])

  const cfgSlots = effectiveCaveConfig.oreSlots.length

  const [graphicsPresetId] = useGraphicsPreset()
  const mineGraphicsPreset = GRAPHICS_PRESETS[graphicsPresetId]

  useEffect(() => {
    if (area.kind !== 'mine') return
    if (state.mineRun?.mineId !== area.id) {
      dispatch({ type: 'MINE_RUN_ENTER', mineId: area.id })
    }
  }, [area.id, area.kind, state.mineRun?.mineId, dispatch])

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
    const cave = effectiveCaveConfig
    const out: WorldChestEntity[] = []
    const proceduralSeed = getProceduralMineCaveSeed(run.runId, run.currentDepth)
    for (let i = 0; i < run.slots.length; i++) {
      const s = run.slots[i]
      /** Tomme kister forbliver i scenen (`cleared` sættes ved tom loot — vi despawner ikke). */
      if (s.kind !== 'chest' || !s.chestEntityId || !s.chestLoot) continue
      const obstacleSlotIndices: number[] = []
      for (let j = 0; j < run.slots.length; j++) {
        if (j === i) continue
        const o = run.slots[j]
        if ((o.kind === 'rock' || o.kind === 'mob') && !o.cleared) obstacleSlotIndices.push(j)
      }
      const position = sinkOreSlotWorldPosition(
        cave.oreSlots[i] as [number, number, number],
        0,
        proceduralSeed,
        cave,
        { anchor: 'chestBase' },
      )
      out.push({
        id: s.chestEntityId,
        slotIndex: i,
        position,
        rotationY: pickChestRotationY({
          runId: run.runId,
          depth: run.currentDepth,
          slotIndex: i,
          chestX: position[0],
          chestZ: position[2],
          oreSlots: cave.oreSlots,
          obstacleSlotIndices,
        }),
        tier: s.chestTier ?? 'wood',
        remainingLoot: s.chestLoot,
        opened: s.chestOpened ?? false,
      })
    }
    return out
  }, [run, area, effectiveCaveConfig])

  const depletedSlots = useMemo(() => {
    if (!run) return new Set<number>()
    const s = new Set<number>()
    run.slots.forEach((slot, i) => {
      if ((slot.kind === 'rock' || slot.kind === 'mob') && slot.cleared) s.add(i)
    })
    return s
  }, [run])

  const targetIdx = run?.targetSlotIndex ?? -1
  const activeSlot = targetIdx >= 0 && run ? run.slots[targetIdx] : undefined
  const runDepth = run?.currentDepth ?? 0

  const liveMobTarget = useMemo(() => {
    if (!run || targetIdx < 0) return false
    const s = run.slots[targetIdx]
    return Boolean(s?.kind === 'mob' && !s.cleared)
  }, [run, targetIdx])

  useEffect(() => {
    if (!run || !liveMobTarget) {
      setMobCombatHint(false)
      return
    }
    const key = `${run.runId}-${run.currentDepth}-${targetIdx}`
    if (mobCombatToastKeyRef.current === key) return
    mobCombatToastKeyRef.current = key
    setMobCombatHint(true)
    const tid = window.setTimeout(() => setMobCombatHint(false), 4500)
    return () => window.clearTimeout(tid)
  }, [run?.runId, run?.currentDepth, targetIdx, liveMobTarget])

  const handleMobStrikeHit = useCallback(() => {
    if (!run) return
    const amount = mobDamagePerTick(run.currentDepth)
    window.setTimeout(() => {
      dispatch({ type: 'PLAYER_TAKE_DAMAGE', amount, source: 'mob' })
    }, 0)
  }, [dispatch, run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const slot = e.key === '1' ? 0 : e.key === '2' ? 1 : e.key === '3' ? 2 : -1
      if (slot >= 0) {
        e.preventDefault()
        dispatch({ type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: slot })
        return
      }
      if (e.key !== 'Tab') return
      e.preventDefault()
      if (state.equippedWeapon === 'pickaxe') {
        dispatch({ type: 'SET_EQUIPPED_WEAPON', weapon: 'sword' })
      } else {
        dispatch({ type: 'SET_EQUIPPED_WEAPON', weapon: 'pickaxe' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, state.equippedWeapon])

  const pushFloater = useCallback((opts: {
    value?: number
    isCrit?: boolean
    text?: string
    color?: string
  }) => {
    if (opts.text != null) {
      if (pickupFeedClearRef.current != null) {
        window.clearTimeout(pickupFeedClearRef.current)
        pickupFeedClearRef.current = null
      }
      const id = hitId.current++
      setPickupFeed({ id, text: opts.text, color: opts.color })
      pickupFeedClearRef.current = window.setTimeout(() => {
        setPickupFeed(null)
        pickupFeedClearRef.current = null
      }, 3400)
      return
    }

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
    }, opts.isCrit ? 900 : 600)
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
    },
    [dispatch],
  )

  const matCount = materialsCount(state)
  const matCap = state.inventoryCapacity.materials

  const handleCollectLoot = useCallback(
    (entityId: string) => {
      const cur = gameStateRef.current
      const entity = lootEntities.find((e) => e.id === entityId)
      if (!entity || entity.collected) return
      const drop = entity.drop
      if (drop.kind === 'consumable') {
        if (!canAddConsumableUnits(cur, drop.quantity)) {
          pushFloater({
            text: 'Forbrugs-lager fuldt!',
            color: '#fbbf24',
          })
          return
        }
      } else if (
        drop.kind !== 'blueprint' &&
        drop.kind !== 'loot_pickaxe' &&
        drop.kind !== 'loot_sword' &&
        drop.kind !== 'loot_armour'
      ) {
        const extra = extraMaterialsFromDrop(drop)
        if (matCount + extra > matCap) {
          pushFloater({
            text: 'Lager fuldt!',
            color: '#fbbf24',
          })
          return
        }
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

  const handleWorldChestClick = useCallback((id: string) => {
    if (typeof document !== 'undefined') document.exitPointerLock?.()
    setActiveChestId(id)
  }, [])

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
      showToast('Ryd alle klipper og uhyrer før du går dybere.', 'info')
      return
    }
    let usedMat = matCount
    let bagUsed = state.hubInventory.consumables.reduce((s, c) => s + c.quantity, 0)
    for (const e of lootEntities) {
      const drop = e.drop
      if (drop.kind === 'consumable') {
        if (bagUsed + drop.quantity > CONSUMABLE_BAG_MAX) continue
        applyDrop(drop)
        bagUsed += drop.quantity
        continue
      }
      if (drop.kind === 'blueprint') {
        applyDrop(drop)
        continue
      }
      if (drop.kind === 'loot_pickaxe' || drop.kind === 'loot_sword' || drop.kind === 'loot_armour') {
        applyDrop(drop)
        continue
      }
      const extra = extraMaterialsFromDrop(drop)
      if (usedMat + extra <= matCap) {
        applyDrop(drop)
        usedMat += extra
      }
    }
    setLootEntities([])
    dispatch({ type: 'MINE_DESCEND_LAYER' })
    showToast(`Ned til dybde ${run.currentDepth + 1}`, 'success', 2200)
  }, [run, lootEntities, matCount, matCap, applyDrop, dispatch, showToast, state.hubInventory.consumables])

  const handleMineStrike = useCallback(
    (slotIndex: number) => {
      if (!run) return
      const struck = run.slots[slotIndex]
      if (!struck || struck.cleared) return

      if (run.targetSlotIndex !== slotIndex) {
        dispatch({ type: 'MINE_SET_TARGET_SLOT', index: slotIndex })
      }

      if (struck.kind === 'rock') {
        if (state.equippedWeapon === 'sword') {
          showToast('Sværd hugger ikke i sten. Skift til hakke (Tab).', 'info')
          return
        }
        if (!pickaxe || pickaxe.durability <= 0) {
          showToast('Hakken er slidt op! Gå til smedjen og reparér med kul.')
          return
        }

        const useDynamite = state.instantBreakNextRock
        const isCrit = !useDynamite && Math.random() < 0.1
        const dmg = useDynamite ? struck.currentHp : isCrit ? pickaxe.damage * 2 : pickaxe.damage

        dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.mineHit })
        playMineHit()
        if (useDynamite) dispatch({ type: 'CONSUME_DYNAMITE' })
        setHitPulse((n) => n + 1)
        setSwingTrigger((n) => n + 1)
        setCrosshairMining(true)
        window.setTimeout(() => setCrosshairMining(false), 140)
        pushFloater({ value: dmg, isCrit })

        const nextHp = Math.max(0, struck.currentHp - dmg)
        const cave = effectiveCaveConfig
        const brokenSlot = slotIndex

        if (nextHp > 0) {
          dispatch({ type: 'MINE_DEAL_DAMAGE', slotIndex: brokenSlot, damage: dmg })
          return
        }

        const drop = rollMineDrop(area, runDepth, state.activeCharms, struck.rockType)
        const coalDrop = rollCoalDrop(runDepth)
        const caveSeed = getProceduralMineCaveSeed(run.runId, runDepth)
        const origin = lootScatterOriginWorldPosition(
          cave.oreSlots[brokenSlot] as [number, number, number],
          caveSeed,
          cave,
        )
        const playable = getPlayableHalfExtents(cave)
        const lootSpawnOpts = {
          spawnClamp: {
            playableHalfX: playable.halfX,
            playableHalfZ: playable.halfZ,
          },
        }

        if (drop.kind !== 'nothing') {
          const entities = explodeDropToEntities(drop, origin, lootSpawnOpts)
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
          const coalEnts = explodeDropToEntities(coalDrop, origin, lootSpawnOpts)
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
        return
      }

      if (struck.kind === 'mob') {
        if (state.equippedWeapon === 'pickaxe') {
          showToast('Brug sværd mod uhyret (Tab).', 'info')
          return
        }
        if (!sword || sword.durability <= 0) {
          showToast('Sværdet er slidt op! Reparér i smedjen med kul.')
          return
        }

        const isCrit = Math.random() < 0.1
        const dmg = isCrit ? sword.damage * 2 : sword.damage

        dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.mineHit })
        dispatch({ type: 'DAMAGE_SWORD', amount: SWORD_HIT_DURABILITY_LOSS })
        playMineHit()
        setHitPulse((n) => n + 1)
        setSwingTrigger((n) => n + 1)
        setCrosshairMining(true)
        window.setTimeout(() => setCrosshairMining(false), 140)
        pushFloater({ value: dmg, isCrit })

        const nextHp = Math.max(0, struck.currentHp - dmg)
        const cave = effectiveCaveConfig
        const brokenSlot = slotIndex

        if (nextHp > 0) {
          dispatch({ type: 'MINE_DEAL_DAMAGE', slotIndex: brokenSlot, damage: dmg })
          return
        }

        const drop = rollMobMineDrop(area, runDepth, state.activeCharms, Math.random, struck.mobType)
        const caveSeed = getProceduralMineCaveSeed(run.runId, runDepth)
        const mobSlotBase = cave.oreSlots[brokenSlot] as [number, number, number]
        const mobLayout = getRockLayoutParams(run.runId, runDepth, brokenSlot, 'mob')
        const mobAnchor = sinkOreSlotWorldPosition(
          mobSlotBase,
          mobLayout.extraSinkY,
          caveSeed,
          cave,
          { rockType: 'mob', meshScaleMultiplier: mobLayout.meshScaleMultiplier },
        )
        const [mx, mz] = mobPlanarOffsetRef.current[brokenSlot] ?? [0, 0]
        const origin = lootScatterOriginWorldPosition(
          [mobAnchor[0] + mx, mobAnchor[1], mobAnchor[2] + mz],
          caveSeed,
          cave,
        )
        const playable = getPlayableHalfExtents(cave)
        const lootSpawnOpts = {
          spawnClamp: {
            playableHalfX: playable.halfX,
            playableHalfZ: playable.halfZ,
          },
        }

        if (drop.kind !== 'nothing') {
          const entities = explodeDropToEntities(drop, origin, lootSpawnOpts)
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
      }
    },
    [
      run,
      pickaxe,
      sword,
      state.equippedWeapon,
      area,
      effectiveCaveConfig,
      runDepth,
      state.activeCharms,
      state.activeEffects,
      state.instantBreakNextRock,
      dispatch,
      pushFloater,
      showToast,
      reportMobPlanarOffset,
    ],
  )

  const canMineRock =
    state.equippedWeapon === 'pickaxe' &&
    Boolean(pickaxe && pickaxe.durability > 0) &&
    activeSlot?.kind === 'rock' &&
    !activeSlot.cleared

  const canFightMob =
    state.equippedWeapon === 'sword' &&
    Boolean(sword && sword.durability > 0) &&
    activeSlot?.kind === 'mob' &&
    !activeSlot.cleared

  /** Uden valgt mål skal første hug stadig registreres (`OreNode` validerer våben). */
  const mineDisabled = targetIdx >= 0 && !canMineRock && !canFightMob

  const activeChest = activeChestId ? worldChests.find((c) => c.id === activeChestId) : null

  const crosshairState = crosshairMining ? 'swing' : crosshairOnTarget ? 'hover-active' : 'normal'

  const hudRockType =
    activeSlot?.kind === 'rock'
      ? activeSlot.rockType
      : activeSlot?.kind === 'mob'
        ? 'mob'
        : undefined
  const hudChestTier =
    activeSlot?.kind === 'chest' ? (activeSlot.chestTier ?? 'wood') : undefined

  if (!run || run.mineId !== area.id) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-950 text-slate-300 text-sm">
        Indlæser mine…
      </div>
    )
  }

  const weaponPixelItem =
    state.equippedWeapon === 'sword' && sword ? sword.pixelItem : (pickaxe?.pixelItem ?? null)
  const weaponSceneGlbUrl =
    state.equippedWeapon === 'sword' && sword
      ? (sword.sceneGlbUrl ?? null)
      : (pickaxe?.sceneGlbUrl ?? null)
  const weaponFpsDev = weaponDevEnabled
    ? {
        transform: state.equippedWeapon === 'sword' ? devSword : devPick,
        glbScaleBase: state.equippedWeapon === 'sword' ? devSwordGlb : devPickGlb,
      }
    : undefined
  const activeTool = state.equippedWeapon === 'sword' ? sword : pickaxe

  const weaponRepairNotice: 'pickaxe' | 'sword' | null =
    pickaxe && pickaxe.durability === 0 && state.equippedWeapon === 'pickaxe'
      ? 'pickaxe'
      : sword && sword.durability === 0 && state.equippedWeapon === 'sword'
        ? 'sword'
        : null

  return (
    <div
      className={`relative w-full h-[100dvh] min-h-0 flex flex-col bg-slate-950 transition-opacity duration-500 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`absolute inset-0 z-0 min-h-0${activeChestId != null ? ' pointer-events-none' : ''}`}
        aria-hidden={activeChestId != null ? true : undefined}
      >
        <MiningCave3D
          key={`${area.id}-${run.runId}-${run.currentDepth}`}
          className="h-full min-h-0 rounded-none border-0 bg-transparent"
          canvasClassName="w-full h-full min-h-[320px] touch-none cursor-crosshair"
          area={area}
          effectiveCaveConfig={effectiveCaveConfig}
          graphicsPresetId={graphicsPresetId}
          graphicsPreset={mineGraphicsPreset}
          mineSlots={run.slots}
          mineRunId={run.runId}
          runDepth={runDepth}
          targetSlotIndex={targetIdx}
          hitPulse={hitPulse}
          disabled={mineDisabled}
          onMineHit={handleMineStrike}
          swingTrigger={swingTrigger}
          heldWeaponKind={state.equippedWeapon}
          weaponPixelItem={weaponPixelItem}
          weaponSceneGlbUrl={weaponSceneGlbUrl}
          weaponFpsDev={weaponFpsDev}
          lootEntities={lootEntities}
          depletedSlots={depletedSlots}
          onCollectLoot={handleCollectLoot}
          worldChests={worldChests}
          onChestClick={handleWorldChestClick}
          onCrosshairTargetChange={setCrosshairOnTarget}
          onMobStrikeHit={handleMobStrikeHit}
          onMobPlanarOffset={reportMobPlanarOffset}
          disablePointerLock={activeChestId != null}
        />
      </div>

      <Crosshair state={crosshairState} />

      {state.runInventory && <MineRunLootPanel state={state} runInventory={state.runInventory} dispatch={dispatch} />}

      {weaponDevEnabled && (
        <WeaponFpsDevPanel
          pick={devPick}
          setPick={setDevPick}
          sword={devSword}
          setSword={setDevSword}
          pickGlb={devPickGlb}
          setPickGlb={setDevPickGlb}
          swordGlb={devSwordGlb}
          setSwordGlb={setDevSwordGlb}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col min-h-0">
        <div className="pointer-events-auto shrink-0">
          <HUDTopBar
            className="shrink-0"
            onBack={onBack}
            depth={runDepth}
            essenceCount={essenceTotal}
            areaLabel={`${area.icon} ${area.name}`}
            roomTemplate={effectiveCaveConfig.template}
            roomSize={effectiveCaveConfig.size}
          />
        </div>
        <HUDPlayerSurvival
          className="pointer-events-none shrink-0"
          visible
          hp={state.playerHp}
          hpMax={effectiveTotalHpMax(state)}
          mana={state.playerMana}
          manaMax={effectiveTotalManaMax(state)}
          manaAccentColor={activeBrew?.color}
          manaAbilityHint={activeBrew?.abilityDescription ?? null}
        />
        <div className="pointer-events-auto shrink-0">
          <HUDWeaponToggle
            equipped={state.equippedWeapon}
            swordUsable={state.swords.some((s) => s.durability > 0)}
            repairNotice={weaponRepairNotice}
            onPickaxe={() => dispatch({ type: 'SET_EQUIPPED_WEAPON', weapon: 'pickaxe' })}
            onSword={() => dispatch({ type: 'SET_EQUIPPED_WEAPON', weapon: 'sword' })}
            trailing={
              <HUDConsumableQuickBar
                density="compact"
                quickSlots={state.consumableQuickSlots}
                consumables={state.hubInventory.consumables}
                onUseSlot={(i) => dispatch({ type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: i })}
              />
            }
          />
        </div>
        {mobCombatHint && liveMobTarget && (
          <div className="pointer-events-none shrink-0 px-3 pt-1 flex justify-center" aria-live="polite">
            <div className="w-full max-w-md rounded-xl border px-3 py-2 text-sm font-medium text-center shadow-lg backdrop-blur-sm bg-slate-900/95 border-slate-600/60 text-slate-100">
              👾 Uhyret angriber dig — skift til sværd (Tab) og slå det ned!
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0" />

        <div className="pointer-events-auto shrink-0 px-2 pb-1 pt-1">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1 flex flex-col gap-1 sm:max-w-[min(56%,520px)]">
              {dropNotice && (
                <RockDropBanner
                  key={dropNotice.id}
                  layout="inline"
                  notice={dropNotice}
                  onDone={() => setDropNotice(null)}
                />
              )}
              {pickupFeed && (
                <p
                  key={pickupFeed.id}
                  className="truncate rounded-md border border-slate-700/60 bg-slate-950/85 px-2 py-1 text-[11px] font-semibold leading-snug text-slate-100 sm:text-xs"
                  style={pickupFeed.color ? { color: pickupFeed.color } : undefined}
                >
                  {pickupFeed.text}
                </p>
              )}
            </div>
          </div>
        </div>

        <HUDBottomBar
          className="shrink-0"
          toolName={activeTool?.name ?? '—'}
          toolKind={state.equippedWeapon === 'sword' ? 'sword' : 'pickaxe'}
          durability={activeTool?.durability ?? 0}
          maxDurability={activeTool?.maxDurability ?? 1}
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
      </div>

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
