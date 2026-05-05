import { useMemo, useState } from 'react'
import type { GameState, MetalName } from '../../types'
import type { Action } from '../../lib/gameState'
import { NUGGET_SELL_PRICES, ORE_SELL_PRICES } from '../../data/market'
import GemCard from '../GemCard'
import PixelItemCard from '../PixelItemCard'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
}

export default function SellTab({ state, dispatch }: Props) {
  const [oreSell, setOreSell] = useState<Partial<Record<MetalName, number>>>({})
  const [nuggetSell, setNuggetSell] = useState<Partial<Record<MetalName, number>>>({})

  const totalGemValue = useMemo(() => state.gems.reduce((s, g) => s + g.goldValue, 0), [state.gems])

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            💎 Ædelsten — {state.gems.length} stk
          </h3>
          <button
            type="button"
            disabled={state.gems.length === 0}
            onClick={() =>
              dispatch({ type: 'SELL_GEMS_BULK', ids: state.gems.map((g) => g.id) })
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-300 disabled:opacity-30 transition-colors"
          >
            Sælg alle ({totalGemValue} g)
          </button>
        </div>

        {state.gems.length === 0 ? (
          <p className="text-slate-500 text-sm">Ingen ædelsten at sælge.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {state.gems.map((gem) => (
              <li
                key={gem.id}
                className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 flex items-center gap-3"
              >
                <div className="shrink-0 scale-[0.72] origin-top-left -mb-2 -mr-2 pointer-events-none select-none">
                  <GemCard gem={gem} isNewest={false} onClick={() => {}} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{gem.name}</p>
                  <p className="text-xs text-slate-400">
                    Effekt: Renhed {gem.purity} · {gem.magicProperties.length} magi
                  </p>
                  <p className="text-amber-200 text-sm font-mono">Salgspris {gem.goldValue} g</p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SELL_GEM', id: gem.id })}
                  className="shrink-0 min-h-[44px] px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm"
                >
                  Sælg
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">⛏️ Rå malm</h3>
        {state.rawOre.length === 0 ? (
          <p className="text-slate-500 text-sm">Ingen rå malm.</p>
        ) : (
          <ul className="space-y-2">
            {state.rawOre.map((ore) => {
              const unitPrice = ORE_SELL_PRICES[ore.metalName] ?? 0
              const qty = Math.min(ore.quantity, Math.max(1, oreSell[ore.metalName] ?? 1))
              const canSell = unitPrice > 0
              return (
                <li
                  key={ore.metalName}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                >
                  <PixelItemCard
                    item={ore.pixelItem}
                    label={ore.metalName}
                    subtitle="Rå malm"
                    count={ore.quantity}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-100 font-semibold">{ore.metalName}</p>
                    <p className="text-xs text-slate-400">
                      {canSell ? `Pris ${unitPrice} g/stk` : 'Kan ikke sælges'} · Beholdning {ore.quantity} stk
                    </p>
                    <p className="text-amber-200 text-sm font-mono">
                      {canSell ? `Værdi ${unitPrice * qty} g` : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={ore.quantity}
                      disabled={!canSell}
                      value={qty}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        const next = Number.isFinite(n)
                          ? Math.max(1, Math.min(ore.quantity, n))
                          : 1
                        setOreSell((s) => ({ ...s, [ore.metalName]: next }))
                      }}
                      className="w-16 text-right rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm px-2 py-1 disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={!canSell}
                      onClick={() =>
                        dispatch({ type: 'SELL_RAW_ORE', metalName: ore.metalName, quantity: qty })
                      }
                      className="min-h-[36px] px-3 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm"
                    >
                      Sælg
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">✨ Metalklumper</h3>
        {state.metalNuggets.length === 0 ? (
          <p className="text-slate-500 text-sm">Ingen metalklumper.</p>
        ) : (
          <ul className="space-y-2">
            {state.metalNuggets.map((nug) => {
              const unitPrice = NUGGET_SELL_PRICES[nug.metalName] ?? 0
              const qty = Math.min(nug.quantity, Math.max(1, nuggetSell[nug.metalName] ?? 1))
              const canSell = unitPrice > 0
              return (
                <li
                  key={nug.metalName}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                >
                  <PixelItemCard
                    item={nug.pixelItem}
                    label={nug.metalName}
                    subtitle="Metalklump"
                    count={nug.quantity}
                    rareGlow={nug.metalName === 'Mithril' || nug.metalName === 'Runestål'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-100 font-semibold">{nug.metalName}</p>
                    <p className="text-xs text-slate-400">
                      {canSell ? `Pris ${unitPrice} g/stk` : 'Kan ikke sælges'} · Beholdning {nug.quantity} stk
                    </p>
                    <p className="text-amber-200 text-sm font-mono">
                      {canSell ? `Værdi ${unitPrice * qty} g` : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={nug.quantity}
                      disabled={!canSell}
                      value={qty}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        const next = Number.isFinite(n)
                          ? Math.max(1, Math.min(nug.quantity, n))
                          : 1
                        setNuggetSell((s) => ({ ...s, [nug.metalName]: next }))
                      }}
                      className="w-16 text-right rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm px-2 py-1 disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={!canSell}
                      onClick={() =>
                        dispatch({ type: 'SELL_NUGGET', metalName: nug.metalName, quantity: qty })
                      }
                      className="min-h-[36px] px-3 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm"
                    >
                      Sælg
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
