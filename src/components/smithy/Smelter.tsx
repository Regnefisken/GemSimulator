import { useEffect, useState } from 'react'
import type { GameState, MetalName } from '../../types'
import { MINEABLE_METALS } from '../../types'
import type { Action } from '../../lib/gameState'
import { SMELTER_TIERS, NUGGET_PER_INGOT, ORE_PER_INGOT } from '../../data/smelterTiers'
import { METALS } from '../../data/metals'
import { canSmelt } from '../../gem/smelting'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
  onGoToShop: () => void
}

export default function Smelter({ state, dispatch, onGoToShop }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 400)
    return () => window.clearInterval(id)
  }, [])

  const tierIdx = Math.max(0, Math.min(SMELTER_TIERS.length - 1, state.smelterTier - 1))
  const tier = SMELTER_TIERS[tierIdx]
  const nextTier = SMELTER_TIERS[state.smelterTier]

  const oreQty = (m: MetalName) => state.rawOre.find((o) => o.metalName === m)?.quantity ?? 0
  const nugQty = (m: MetalName) => state.metalNuggets.find((n) => n.metalName === m)?.quantity ?? 0

  return (
    <section className="rounded-2xl border border-amber-900/50 bg-slate-900/80 p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">🔥 Smelter</h2>
      <p className="text-slate-400 text-sm mb-4">Malm og metalklumper bliver til metalbarer.</p>

      <div className="mb-6 rounded-xl border border-slate-600 bg-slate-950/60 p-4">
        <div className="font-semibold text-slate-200">{tier.name}</div>
        <p className="text-xs text-slate-500 mt-1">
          Tilladte metaller: {tier.allowedMetals.map((m) => METALS[m].icon).join(' ')}
        </p>
        {nextTier ? (
          <button
            type="button"
            onClick={onGoToShop}
            className="mt-3 text-sm text-amber-400 hover:text-amber-300 font-medium underline-offset-2 hover:underline"
          >
            Opgrader til {nextTier.name} ({nextTier.upgradeCost.toLocaleString('da-DK')} g) — Butikken
          </button>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Maks. smelter-niveau.</p>
        )}
      </div>

      <div className="space-y-4">
        {MINEABLE_METALS.map((metalName) => {
          const allowed = canSmelt(metalName, state.smelterTier)
          const needOre = ORE_PER_INGOT[metalName]
          const needNug = NUGGET_PER_INGOT[metalName]
          const hasOrePath = needOre > 0
          const hasNugPath = needNug > 0
          if (!hasOrePath && !hasNugPath) return null

          const oreOk = allowed && hasOrePath && oreQty(metalName) >= needOre
          const nugOk = allowed && hasNugPath && nugQty(metalName) >= needNug
          const tierTip = !allowed ? `Kræver højere smelter (tier) for ${metalName}.` : ''

          return (
            <div
              key={metalName}
              className="grid sm:grid-cols-2 gap-3 rounded-xl border border-slate-700/80 bg-slate-800/40 p-3"
            >
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <span>{METALS[metalName].icon}</span>
                <span>{metalName}</span>
              </div>
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-2">
                {hasOrePath && (
                  <button
                    type="button"
                    disabled={!oreOk}
                    title={!allowed ? tierTip : !oreOk ? `Kræver ${needOre} malm.` : `Smelt ${needOre} malm → 1 bar`}
                    onClick={() => dispatch({ type: 'START_SMELTING', metalName, source: 'ore' })}
                    className="min-h-[44px] rounded-lg px-3 text-sm font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-100"
                  >
                    Smelt fra malm ({needOre})
                  </button>
                )}
                {hasNugPath && (
                  <button
                    type="button"
                    disabled={!nugOk}
                    title={
                      !allowed
                        ? tierTip
                        : !nugOk
                          ? `Kræver ${needNug} klump (★).`
                          : `Hurtig smeltning fra klump`
                    }
                    onClick={() => dispatch({ type: 'START_SMELTING', metalName, source: 'nugget' })}
                    className="min-h-[44px] rounded-lg px-3 text-sm font-semibold bg-amber-900/40 border border-amber-700/50 hover:bg-amber-900/60 disabled:opacity-40 disabled:cursor-not-allowed text-amber-100"
                  >
                    Smelt fra klump ★ ({needNug})
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {state.smeltingJobs.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">I gang</h3>
          {state.smeltingJobs.map((job) => {
            const p = Math.min(1, (now - job.startedAt) / job.timeMs)
            return (
              <div key={job.id} className="rounded-lg border border-slate-600 bg-slate-950/50 p-3">
                <div className="flex justify-between text-sm text-slate-300 mb-1">
                  <span>
                    {METALS[job.metalName].icon} {job.metalName}
                    {job.source === 'nugget' ? ' ★' : ''}
                  </span>
                  <span>{Math.round(p * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-[width] duration-300"
                    style={{ width: `${p * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
