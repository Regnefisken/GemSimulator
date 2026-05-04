import { useCallback, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import type { Area, GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { materialsCount } from '../../lib/gameState'
import { XP_REWARDS } from '../../lib/leveling'
import { rockHpForDepth, rollBonusMineEssence, rollMineDrop, type MineDrop } from '../../gem/mining'
import { ESSENCE_IDS, getEssenceDef, MOON_TEAR_EFFECT_ID } from '../../data/essences'
import { playEssenceFound, playGemFound, playMineHit, playRockBreak } from '../../lib/sounds'
import { useToast } from '../ui/ToastContext'
import Rock3DScene from './Rock3DScene'
import PickaxeOverlay from './PickaxeOverlay'
import DamageNumbers, { type DamageFloater } from './DamageNumbers'
import MineHUD from './MineHUD'

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
  const [striking, setStriking] = useState(false)
  const [floaters, setFloaters] = useState<DamageFloater[]>([])
  const [wow, setWow] = useState<'gem' | 'nugget' | null>(null)
  const hitId = useRef(0)
  const phoenixQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.phoenixAsh)?.quantity ?? 0
  const slumberQ = state.essences.find((s) => s.essenceId === ESSENCE_IDS.slumberPowder)?.quantity ?? 0
  const moonBuffActive = state.activeEffects.some(
    (e) => e.id === MOON_TEAR_EFFECT_ID && (e.expiresAt == null || e.expiresAt > Date.now()),
  )

  useLayoutEffect(() => {
    const max = rockHpForDepth(state.depth, area)
    setMaxHp(max)
    setRockHp(max)
  }, [state.depth, area])

  const pushFloater = useCallback((value: number) => {
    const id = hitId.current++
    const left = `${42 + Math.random() * 16}%`
    const top = `${38 + Math.random() * 12}%`
    setFloaters((prev) => [...prev, { id, value, left, top }])
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id))
    }, 600)
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

  const handleMineHit = useCallback(() => {
    if (!pickaxe || pickaxe.durability <= 0) {
      showToast('Hakken er i stykker! Køb reparations-kit eller en ny hakke i Butikken.')
      return
    }

    const useDynamite = state.instantBreakNextRock
    const dmg = useDynamite ? rockHp : pickaxe.damage

    dispatch({ type: 'GAIN_XP', amount: XP_REWARDS.mineHit })
    dispatch({ type: 'DAMAGE_PICKAXE', amount: 1 })
    playMineHit()
    if (useDynamite) dispatch({ type: 'CONSUME_DYNAMITE' })
    setHitPulse((n) => n + 1)
    setStriking(true)
    window.setTimeout(() => setStriking(false), 220)
    pushFloater(dmg)

    const nextHp = rockHp - dmg
    if (nextHp > 0) {
      setRockHp(nextHp)
      return
    }

    setRockHp(0)
    playRockBreak()
    const drop = rollMineDrop(area, state.depth, state.activeCharms)
    const extra = extraMaterialsFromDrop(drop)
    if (extra > 0 && matCount + extra > matCap) {
      showToast('Råmaterialer: lager fuldt — droppet gik tabt.')
    } else {
      applyDrop(drop)
      if (drop.kind === 'gem') {
        playGemFound()
        setWow('gem')
        window.setTimeout(() => setWow(null), 2200)
      } else if (drop.kind === 'nugget') {
        setWow('nugget')
        window.setTimeout(() => setWow(null), 2200)
      }
    }
    const bonusEss = rollBonusMineEssence(area, state.activeEffects, state.activeCharms)
    if (bonusEss) {
      dispatch({ type: 'ADD_ESSENCE', essenceId: bonusEss, quantity: 1 })
      playEssenceFound()
      const name = getEssenceDef(bonusEss)?.name ?? bonusEss
      showToast(`Essens fundet: ${name}`, 'success')
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
        <p className="text-slate-500 text-sm mt-0.5">Klik på klippen for at hugge.</p>
      </div>

      <MineHUD
        depth={state.depth}
        hp={rockHp}
        maxHp={maxHp}
        pickaxeName={pickaxe?.name ?? '—'}
        durability={pickaxe?.durability ?? 0}
        maxDurability={pickaxe?.maxDurability ?? 1}
        dynamiteReady={state.instantBreakNextRock}
      />

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
        <Rock3DScene
          hp={rockHp}
          maxHp={maxHp}
          hitPulse={hitPulse}
          onMineHit={handleMineHit}
          disabled={mineDisabled}
        />
        <PickaxeOverlay striking={striking} />
        <DamageNumbers items={floaters} />
      </div>

      {wow && (
        <div
          className="fixed inset-0 pointer-events-none z-[65] flex items-center justify-center px-4 animate-wow-burst"
          aria-live="polite"
        >
          <div className="text-center text-2xl sm:text-4xl font-black text-fuchsia-100 drop-shadow-[0_0_28px_rgba(232,121,249,0.85)] leading-tight">
            {wow === 'gem' ? (
              <>
                ✦ SJÆLDEN ÆDELSTEN! ✦
              </>
            ) : (
              <>
                ★ METALKLUMP! ★
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
