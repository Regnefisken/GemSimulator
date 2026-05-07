import { useId, useMemo, useRef, useState, type CSSProperties, type Dispatch } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import PixelItemCard from '../PixelItemCard'
import { playAnvilStrike } from '../../lib/sounds'

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
}

type DurabilityPiece = { tier: number; durability: number; maxDurability: number }

function coalForFullRepair(tool: DurabilityPiece): number {
  const missing = tool.maxDurability - tool.durability
  if (missing <= 0) return 0
  return Math.max(1, Math.ceil(missing * (0.1 + tool.tier * 0.055)))
}

export default function RepairStation({ state, dispatch }: Props) {
  const anvilGradId = useId().replace(/:/g, '')
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; dx: string; dy: string }[]>([])
  const [floats, setFloats] = useState<{ id: number; text: string }[]>([])
  const [swing, setSwing] = useState(0)
  const idRef = useRef(0)

  const pick = useMemo(
    () => state.pickaxes.find((p) => p.id === state.activePickaxeId) ?? state.pickaxes[0] ?? null,
    [state.pickaxes, state.activePickaxeId],
  )
  const sw = useMemo(
    () => state.swords.find((s) => s.id === state.activeSwordId) ?? state.swords[0] ?? null,
    [state.swords, state.activeSwordId],
  )
  const arm = useMemo(
    () => state.armours.find((a) => a.id === state.activeArmourId) ?? null,
    [state.armours, state.activeArmourId],
  )

  const pickCost = pick ? coalForFullRepair(pick) : 0
  const swordCost = sw ? coalForFullRepair(sw) : 0
  const armCost = arm ? coalForFullRepair(arm) : 0
  const pickFull = pick ? pick.durability >= pick.maxDurability : true
  const swordFull = sw ? sw.durability >= sw.maxDurability : true
  const armFull = arm ? arm.durability >= arm.maxDurability : true

  function sparkBurst() {
    const newSparks = Array.from({ length: 4 + Math.floor(Math.random() * 3) }, () => {
      const dx = `${(Math.random() - 0.5) * 72}px`
      const dy = `${-28 - Math.random() * 36}px`
      return {
        id: ++idRef.current,
        x: 50 + (Math.random() - 0.5) * 14,
        y: 72 + (Math.random() - 0.5) * 8,
        dx,
        dy,
      }
    })
    setSparks((s) => [...s, ...newSparks])
    window.setTimeout(() => {
      setSparks((s) => s.filter((sp) => !newSparks.some((n) => n.id === sp.id)))
    }, 450)
  }

  function repairWithCoal(tool: 'pickaxe' | 'sword' | 'armour', id: string, cost: number, label: string) {
    if (cost <= 0) return
    if (state.coal < cost) return
    dispatch({ type: 'REPAIR_TOOL_WITH_COAL', tool, id })
    playAnvilStrike()
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
    setSwing((n) => n + 1)
    sparkBurst()
    const floatId = ++idRef.current
    setFloats((f) => [...f, { id: floatId, text: `-${cost} kul · ${label}` }])
    window.setTimeout(() => {
      setFloats((f) => f.filter((fl) => fl.id !== floatId))
    }, 900)
  }

  return (
    <section className="rounded-2xl border border-amber-900/50 bg-slate-900/80 p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">🛠️ Reparationsbænk</h2>
      <p className="text-slate-400 text-sm mb-4">
        Fuld reparation af hakke, sværd eller <strong className="text-slate-200">rustning</strong> mod{' '}
        <strong className="text-amber-200/90">kul</strong> (D25/D28). Prisen stiger med tier og slidt holdbarhed.
        Skift aktivt våben i lager-fanen; rustning repareres for den du bærer.
      </p>
      <p className="text-xs text-slate-500 mb-4">
        Kul på lager: <span className="font-mono text-slate-200">{state.coal}</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-amber-200/90">Aktiv hakke</h3>
          {!pick ? (
            <p className="text-slate-500 text-sm">Ingen hakke.</p>
          ) : (
            <>
              <PixelItemCard item={pick.pixelItem} label={pick.name} subtitle={`Tier ${pick.tier}`} />
              <div className="text-xs text-slate-400">
                Holdbarhed{' '}
                <span className="font-mono text-slate-200">
                  {pick.durability} / {pick.maxDurability}
                </span>
              </div>
              <button
                type="button"
                disabled={pickFull || state.coal < pickCost}
                title={pickFull ? 'Allerede fuld' : state.coal < pickCost ? `Kræver ${pickCost} kul` : ''}
                onClick={() => repairWithCoal('pickaxe', pick.id, pickCost, pick.name)}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-slate-950 font-bold text-sm"
              >
                {pickFull ? '✓ Hakke fuld' : `Reparér for ${pickCost} kul`}
              </button>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-violet-200/90">Aktivt sværd</h3>
          {!sw ? (
            <p className="text-slate-500 text-sm">Intet sværd.</p>
          ) : (
            <>
              <PixelItemCard item={sw.pixelItem} label={sw.name} subtitle={`Tier ${sw.tier}`} />
              <div className="text-xs text-slate-400">
                Holdbarhed{' '}
                <span className="font-mono text-slate-200">
                  {sw.durability} / {sw.maxDurability}
                </span>
              </div>
              <button
                type="button"
                disabled={swordFull || state.coal < swordCost}
                title={swordFull ? 'Allerede fuld' : state.coal < swordCost ? `Kræver ${swordCost} kul` : ''}
                onClick={() => repairWithCoal('sword', sw.id, swordCost, sw.name)}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-b from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-slate-50 font-bold text-sm"
              >
                {swordFull ? '✓ Sværd fuld' : `Reparér for ${swordCost} kul`}
              </button>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Rustning (aktiv)</h3>
          {!arm ? (
            <p className="text-slate-500 text-sm">Ingen rustning på — vælg i Lager → Redskaber.</p>
          ) : (
            <>
              <PixelItemCard item={arm.pixelItem} label={arm.name} subtitle={`Tier ${arm.tier}`} />
              <div className="text-xs text-slate-400">
                Holdbarhed{' '}
                <span className="font-mono text-slate-200">
                  {arm.durability} / {arm.maxDurability}
                </span>
              </div>
              <button
                type="button"
                disabled={armFull || state.coal < armCost}
                title={armFull ? 'Allerede fuld' : state.coal < armCost ? `Kræver ${armCost} kul` : ''}
                onClick={() => repairWithCoal('armour', arm.id, armCost, arm.name)}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-slate-50 font-bold text-sm"
              >
                {armFull ? '✓ Rustning fuld' : `Reparér for ${armCost} kul`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <div className="relative w-full h-40 sm:h-44 rounded-xl bg-slate-950/60 border border-slate-700 overflow-hidden">
          <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2">
            <div
              key={swing}
              className="repair-hammer-strike text-5xl sm:text-6xl leading-none select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
              aria-hidden
            >
              🔨
            </div>
          </div>

          <svg
            className="absolute bottom-1 left-1/2 w-[min(88%,220px)] h-auto -translate-x-1/2 pointer-events-none select-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
            viewBox="0 0 200 78"
            aria-hidden
          >
            <defs>
              <linearGradient id={`${anvilGradId}-top`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#7c8c9f" />
              </linearGradient>
              <linearGradient id={`${anvilGradId}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="55%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id={`${anvilGradId}-base`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3f4a55" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>
            <path
              d="M 26 66 L 174 66 L 170 78 H 30 Z"
              fill={`url(#${anvilGradId}-base)`}
              stroke="#0f172a"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            <path
              d="M 54 66 V 46 H 146 V 66"
              fill={`url(#${anvilGradId}-body)`}
              stroke="#1e293b"
              strokeWidth="0.6"
            />
            <path
              d="M 42 46 L 40 28 L 48 24 H 152 L 158 28 L 156 46 Z"
              fill={`url(#${anvilGradId}-body)`}
              stroke="#1e293b"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
            <path
              d="M 40 28 L 12 32 L 8 40 L 38 36 Z"
              fill="#526077"
              stroke="#1e293b"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <path
              d="M 28 24 L 34 16 H 166 L 172 24 Z"
              fill={`url(#${anvilGradId}-top)`}
              stroke="#334155"
              strokeWidth="0.85"
              strokeLinejoin="round"
            />
          </svg>

          {sparks.map((sp) => (
            <span
              key={sp.id}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 z-20 spark-fly pointer-events-none"
              style={
                {
                  left: `${sp.x}%`,
                  top: `${sp.y}%`,
                  '--dx': sp.dx,
                  '--dy': sp.dy,
                } as CSSProperties
              }
            />
          ))}

          {floats.map((fl) => (
            <span
              key={fl.id}
              className="absolute left-1/2 top-[72%] text-emerald-300 font-bold text-sm float-up pointer-events-none -translate-x-1/2"
            >
              {fl.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
