import { useRef, useState, type CSSProperties, type Dispatch } from 'react'
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
        x: 50 + (Math.random() - 0.5) * 60,
        y: 50 + (Math.random() - 0.5) * 30,
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
              <div
                key={swing}
                className="absolute top-3 left-1/2 hammer-strike text-6xl sm:text-7xl leading-none select-none"
                aria-hidden
              >
                🔨
              </div>

              {sparks.map((sp) => (
                <span
                  key={sp.id}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 spark-fly pointer-events-none"
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
                  className="absolute left-1/2 top-1/2 text-emerald-300 font-bold text-lg float-up pointer-events-none"
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
              {isFull ? '✓ Færdigreparet' : '🔨 Slå med hammeren'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
