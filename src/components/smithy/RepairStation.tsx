import { useId, useRef, useState, type CSSProperties, type Dispatch } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import PixelItemCard from '../PixelItemCard'
import { playAnvilStrike } from '../../lib/sounds'

const SLAGS_FOR_FULD_REPARATION = 20

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
}

export default function RepairStation({ state, dispatch }: Props) {
  const anvilGradId = useId().replace(/:/g, '')
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; dx: string; dy: string }[]>([])
  const [floats, setFloats] = useState<{ id: number; amount: number }[]>([])
  const [swing, setSwing] = useState(0)
  const idRef = useRef(0)

  const active = state.pickaxes.find((p) => p.id === state.activePickaxeId)
  const chunk = active ? Math.max(1, Math.ceil(active.maxDurability / SLAGS_FOR_FULD_REPARATION)) : 0
  const isFull = active ? active.durability >= active.maxDurability : true

  function handleStrike() {
    if (!active || isFull) return
    dispatch({ type: 'REPAIR_PICKAXE', amount: chunk })
    playAnvilStrike()
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)

    const id = ++idRef.current
    setSwing(id)

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

    const floatId = ++idRef.current
    setFloats((f) => [...f, { id: floatId, amount: chunk }])
    window.setTimeout(() => {
      setFloats((f) => f.filter((fl) => fl.id !== floatId))
    }, 800)
  }

  return (
    <section className="rounded-2xl border border-amber-900/50 bg-slate-900/80 p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">🛠️ Reparationsbænk</h2>
      <p className="text-slate-400 text-sm mb-4">
        Slå på ambolten for at reparere din aktive hakke. Skift aktiv hakke i lageret.
      </p>

      {!active ? (
        <p className="text-slate-500 text-sm">Du har ingen aktiv hakke.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
          <div className="flex flex-col items-center gap-2">
            <PixelItemCard item={active.pixelItem} label={active.name} subtitle={`Tier ${active.tier}`} />
            <div className="w-full max-w-[200px] sm:max-w-none">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Holdbarhed</span>
                <span className="font-mono text-slate-200">
                  {active.durability} / {active.maxDurability}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-150"
                  style={{ width: `${(active.durability / active.maxDurability) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <div className="relative w-full h-48 sm:h-52 rounded-xl bg-slate-950/60 border border-slate-700 overflow-hidden">
              <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2">
                <div
                  key={swing}
                  className="repair-hammer-strike text-6xl sm:text-7xl leading-none select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
                  aria-hidden
                >
                  🔨
                </div>
              </div>

              <svg
                className="absolute bottom-1 left-1/2 w-[min(88%,240px)] h-auto -translate-x-1/2 pointer-events-none select-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
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
                {/* Fod */}
                <path
                  d="M 26 66 L 174 66 L 170 78 H 30 Z"
                  fill={`url(#${anvilGradId}-base)`}
                  stroke="#0f172a"
                  strokeWidth="0.75"
                  strokeLinejoin="round"
                />
                {/* Skaft / midte */}
                <path
                  d="M 54 66 V 46 H 146 V 66"
                  fill={`url(#${anvilGradId}-body)`}
                  stroke="#1e293b"
                  strokeWidth="0.6"
                />
                {/* Bulk under slagflade */}
                <path
                  d="M 42 46 L 40 28 L 48 24 H 152 L 158 28 L 156 46 Z"
                  fill={`url(#${anvilGradId}-body)`}
                  stroke="#1e293b"
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                />
                {/* Horn (venstre) */}
                <path
                  d="M 40 28 L 12 32 L 8 40 L 38 36 Z"
                  fill="#526077"
                  stroke="#1e293b"
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                />
                {/* Slagflade set forfra */}
                <path
                  d="M 28 24 L 34 16 H 166 L 172 24 Z"
                  fill={`url(#${anvilGradId}-top)`}
                  stroke="#334155"
                  strokeWidth="0.85"
                  strokeLinejoin="round"
                />
                <path
                  d="M 34 16 L 38 12 H 162 L 166 16"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  opacity="0.35"
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
                  className="absolute left-1/2 top-[72%] text-emerald-300 font-bold text-lg float-up pointer-events-none"
                >
                  +{fl.amount}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStrike}
              disabled={isFull}
              className="
                w-full min-h-[56px] px-6 rounded-xl
                bg-gradient-to-b from-amber-600 to-amber-700
                hover:from-amber-500 hover:to-amber-600
                active:translate-y-0.5 active:from-amber-700 active:to-amber-800
                disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed
                text-slate-950 font-extrabold text-lg shadow-lg
                transition-all duration-75
              "
            >
              {isFull ? '✓ Færdigreparet' : 'Reparer'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
