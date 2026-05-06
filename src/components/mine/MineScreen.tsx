import { useCallback, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import type { Area, ChestTier, GameState, RockEvent } from '../../types'
import type { Action } from '../../lib/gameState'
import { materialsCount } from '../../lib/gameState'
import { XP_REWARDS } from '../../lib/leveling'
import {
  rockHpForDepth,
  rollBonusMineEssence,
  rollBlueprintFromGoldChest,
  rollChestReward,
  rollMineDrop,
  rollRockEvent,
  type MineDrop,
} from '../../gem/mining'
import { ESSENCE_IDS, getEssenceDef, MOON_TEAR_EFFECT_ID } from '../../data/essences'
import { findBlueprint } from '../../data/blueprints'
import { playEssenceFound, playGemFound, playMineHit, playRockBreak } from '../../lib/sounds'
import { useToast } from '../ui/ToastContext'
import ChestScene from './ChestScene'
import MiningCave3D from './3d/MiningCave3D'
import DamageNumbers, { type DamageFloater } from './DamageNumbers'
import MineHUD from './MineHUD'
import RockDropBanner, { type DropNotice } from './RockDropBanner'

type Props = {
  area: Area
  state: GameState
  dispatch: Dispatch<Action>
  onBack: () => void
}

function extraMaterialsFromDrop(drop: MineDrop): number {
  switch (drop.kind) {
    case 'ore':
      return drop.ore.quantity
    case 'nugget':
      return drop.nugget.quantity
    case 'rough-stone':
      return 1
    case 'chest':
      return 0
    case 'blueprint':
      return 0
    default:
      return 0
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
  const noticeId = useRef(0)
  const hitId = useRef(0)
  const phoenixQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.phoenixAsh)?.quantity ?? 0
  const slumberQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.slumberPowder)?.quantity ?? 0
  const moonBuffActive = state.activeEffects.some(
    (e) => e.id === MOON_TEAR_EFFECT_ID && (e.expiresAt == null || e.expiresAt > Date.now()),
  )

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

  const pushFloater = useCallback((value: number, isCrit = false) => {
    const id = hitId.current++
    const left = `${42 + Math.random() * 16}%`
    const top = `${38 + Math.random() * 12}%`
    setFloaters((prev) => [...prev, { id, value, left, top, isCrit }])
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id))
    }, isCrit ? 900 : 600)
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
        case 'chest':
          break
        case 'blueprint':
          break
        default:
          break
      }
    },
    [dispatch],
  )

  const matCount = materialsCount(state)
  const matCap = state.inventoryCapacity.materials

  const handleOpenChest = useCallback(() => {
    const tier: ChestTier = rockEvent.type === 'chest' ? (rockEvent.chestTier ?? 'wood') : 'wood'
    const gold = rollChestReward(area, state.depth, tier)
    dispatch({ type: 'OPEN_CHEST', gold })
    playRockBreak()
    const bonusEss = rollBonusMineEssence(area, state.activeEffects, state.activeCharms)
    if (bonusEss) {
      dispatch({ type: 'ADD_ESSENCE', essenceId: bonusEss, quantity: 1 })
      playEssenceFound()
    }
    const ess = bonusEss ? getEssenceDef(bonusEss) : null

    const rolledBpId = rollBlueprintFromGoldChest(area.id, tier)
    let chestBlueprintId: string | null = null
    let chestBlueprintName: string | null = null
    if (rolledBpId) {
      const def = findBlueprint(rolledBpId)
      chestBlueprintId = rolledBpId
      chestBlueprintName = def?.name ?? rolledBpId
      if (!state.unlockedBlueprints.includes(rolledBpId)) {
        dispatch({ type: 'UNLOCK_BLUEPRINT', blueprintId: rolledBpId })
        showToast(`📜 Blueprint: ${chestBlueprintName}`, 'success', 5500)
      } else {
        showToast(`${chestBlueprintName} — du har allerede denne blueprint.`, 'info', 4000)
      }
    }

    setDropNotice({
      id: noticeId.current++,
      drop: { kind: 'chest', gold, tier },
      essenceId: bonusEss ?? null,
      essenceName: ess?.name ?? null,
      chestBlueprintId,
      chestBlueprintName,
    })
    dispatch({ type: 'INCREMENT_DEPTH' })
  }, [
    area,
    state.depth,
    state.activeEffects,
    state.activeCharms,
    state.unlockedBlueprints,
    dispatch,
    rockEvent,
    showToast,
  ])

  const handleMineHit = useCallback(() => {
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
    pushFloater(dmg, isCrit)

    const nextHp = rockHp - dmg
    if (nextHp > 0) {
      setRockHp(nextHp)
      return
    }

    setRockHp(0)
    playRockBreak()
    const drop = rollMineDrop(area, state.depth, state.activeCharms, rockEvent.type)
    const extra = extraMaterialsFromDrop(drop)
    const lostToFullInventory = extra > 0 && matCount + extra > matCap
    if (lostToFullInventory) {
      showToast(
        'Lageret for råmaterialer (malm, klumper, rå klipper) er fuldt, så droppet gik tabt. Gå til butikken fra kortet og brug fanen «Sælg», eller brug materialerne i smedjen, så der bliver plads igen.',
        'info',
        7000,
      )
    } else {
      applyDrop(drop)
      if (drop.kind === 'gem') playGemFound()
    }
    const bonusEss = rollBonusMineEssence(area, state.activeEffects, state.activeCharms)
    if (bonusEss) {
      dispatch({ type: 'ADD_ESSENCE', essenceId: bonusEss, quantity: 1 })
      playEssenceFound()
    }
    if (!lostToFullInventory) {
      const ess = bonusEss ? getEssenceDef(bonusEss) : null
      setDropNotice({
        id: noticeId.current++,
        drop,
        essenceId: bonusEss ?? null,
        essenceName: ess?.name ?? null,
      })
    }

    dispatch({ type: 'INCREMENT_DEPTH' })
    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.rockBroken })
  }, [
    pickaxe,
    rockHp,
    area,
    state.depth,
    state.activeCharms,
    state.activeEffects,
    state.instantBreakNextRock,
    matCap,
    matCount,
    dispatch,
    pushFloater,
    showToast,
    applyDrop,
    rockEvent,
  ])

  const mineDisabled = !pickaxe || pickaxe.durability <= 0

  return (
    <div className="space-y-4 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
      >
        ← Tilbage til kortet
      </button>

      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>{area.icon}</span> {area.name}
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Gå ind i grotten og venstreklik på den aktive malm for at hugge.
        </p>
      </div>

      <MineHUD
        depth={state.depth}
        hp={rockHp}
        maxHp={maxHp}
        pickaxeName={pickaxe?.name ?? '—'}
        durability={pickaxe?.durability ?? 0}
        maxDurability={pickaxe?.maxDurability ?? 1}
        dynamiteReady={state.instantBreakNextRock}
        rockType={rockEvent.type !== 'chest' ? rockEvent.type : undefined}
        chestTier={rockEvent.type === 'chest' ? (rockEvent.chestTier ?? 'wood') : undefined}
      />

      {pickaxe && pickaxe.durability === 0 && (
        <div
          className="rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/95"
          role="status"
        >
          🔨 Din hakke er slidt op. Gå til <strong className="text-amber-50">smedjen</strong> på kortet og reparér den
          på reparationsbænken.
        </div>
      )}

      {(moonBuffActive || phoenixQ > 0 || slumberQ > 0) && (
        <div className="rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm space-y-2">
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

      <div className="relative">
        {rockEvent.type === 'chest' ? (
          <ChestScene
            onOpen={handleOpenChest}
            tier={rockEvent.chestTier ?? 'wood'}
          />
        ) : (
          <MiningCave3D
            area={area}
            hp={rockHp}
            maxHp={maxHp}
            hitPulse={hitPulse}
            rockType={rockEvent.type}
            disabled={mineDisabled}
            depth={state.depth}
            onMineHit={handleMineHit}
          />
        )}
        <DamageNumbers items={floaters} />
        {dropNotice && (
          <RockDropBanner
            key={dropNotice.id}
            notice={dropNotice}
            onDone={() => setDropNotice(null)}
          />
        )}
      </div>
    </div>
  )
}
