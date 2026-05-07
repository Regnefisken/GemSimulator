import { useState } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { makePickaxe } from '../../data/pickaxes'
import { makeSword } from '../../data/swords'
import { SMELTER_TIERS } from '../../data/smelterTiers'
import {
  SHOP_CHARMS,
  SHOP_CONSUMABLES,
  SHOP_INVENTORY_PACKS,
  SHOP_PICKAXE_OFFERS,
  SHOP_SWORD_OFFERS,
  SHOP_TAB_LABELS,
  type ShopTabId,
  smelterNextUpgradeCost,
} from '../../data/shop'
import { playGoldSpend } from '../../lib/sounds'
import SellTab from './SellTab'
import BlueprintShopTab from '../jewelry/BlueprintShopTab'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
  onBack: () => void
}

function goldOk(state: GameState, price: number) {
  return state.gold >= price
}

export default function ShopScreen({ state, dispatch, onBack }: Props) {
  const [tab, setTab] = useState<ShopTabId>('pickaxes')

  const nextSmelterCost = smelterNextUpgradeCost(state.smelterTier)
  const nextSmelterDef =
    state.smelterTier < SMELTER_TIERS.length ? SMELTER_TIERS[state.smelterTier] : null

  function buyPickaxe(tier: number) {
    playGoldSpend()
    dispatch({ type: 'BUY_PICKAXE', tier })
  }

  function buySword(tier: number) {
    playGoldSpend()
    dispatch({ type: 'BUY_SWORD', tier })
  }

  function buySmelter() {
    playGoldSpend()
    dispatch({ type: 'UPGRADE_SMELTER' })
  }

  function buyConsumable(id: string) {
    playGoldSpend()
    dispatch({ type: 'BUY_CONSUMABLE', id })
  }

  function buyPack(packId: string) {
    playGoldSpend()
    dispatch({ type: 'EXPAND_INVENTORY', packId })
  }

  function buyCharm(charmId: string) {
    playGoldSpend()
    dispatch({ type: 'BUY_CHARM', charmId })
  }

  const tabBtn = (id: ShopTabId) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={
        'px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ' +
        (tab === id
          ? 'bg-amber-600 text-slate-950'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
      }
    >
      {SHOP_TAB_LABELS[id]}
    </button>
  )

  return (
    <div className="space-y-6 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
      >
        ← Tilbage til kortet
      </button>

      <div className="rounded-2xl border border-amber-900/40 bg-slate-900/90 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-amber-100 flex items-center gap-2">🪙 Butikken</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Guld: <span className="text-amber-200 font-mono font-semibold">{state.gold}</span> · lvl{' '}
              <span className="text-slate-200 font-mono">{state.level}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          {(Object.keys(SHOP_TAB_LABELS) as ShopTabId[]).map((id) => tabBtn(id))}
        </div>

        {tab === 'pickaxes' && (
          <ul className="space-y-3">
            {SHOP_PICKAXE_OFFERS.map((o) => {
              const p = makePickaxe(o.tier)
              const canLevel = state.level >= o.minLevel
              const canGold = goldOk(state, o.price)
              const canTools = state.pickaxes.length + state.swords.length < state.inventoryCapacity.tools
              const disabled = !canLevel || !canGold || !canTools
              const why = !canLevel
                ? `Krav ikke opfyldt: lvl ${o.minLevel} kræves.`
                : !canGold
                  ? `Krav ikke opfyldt: ${o.price} g kræves.`
                  : !canTools
                    ? `Lager fuldt: Værktøj (${state.pickaxes.length + state.swords.length}/${state.inventoryCapacity.tools}).`
                    : ''
              return (
                <li
                  key={o.tier}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Skade {p.damage} · Holdbarhed {p.maxDurability}
                    </div>
                    <div className="text-sm text-amber-200/90 mt-1">
                      Pris {o.price.toLocaleString('da-DK')} g · Krav lvl {o.minLevel}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    title={why}
                    onClick={() => buyPickaxe(o.tier)}
                    className="min-h-[44px] px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm shrink-0"
                  >
                    Køb
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'swords' && (
          <ul className="space-y-3">
            {SHOP_SWORD_OFFERS.map((o) => {
              const s = makeSword(o.tier)
              const canLevel = state.level >= o.minLevel
              const canGold = goldOk(state, o.price)
              const canTools = state.pickaxes.length + state.swords.length < state.inventoryCapacity.tools
              const disabled = !canLevel || !canGold || !canTools
              const why = !canLevel
                ? `Krav ikke opfyldt: lvl ${o.minLevel} kræves.`
                : !canGold
                  ? `Krav ikke opfyldt: ${o.price} g kræves.`
                  : !canTools
                    ? `Lager fuldt: Værktøj (${state.pickaxes.length + state.swords.length}/${state.inventoryCapacity.tools}).`
                    : ''
              return (
                <li
                  key={o.tier}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{s.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Skade {s.damage} · Holdbarhed {s.maxDurability}
                    </div>
                    <div className="text-sm text-amber-200/90 mt-1">
                      Pris {o.price.toLocaleString('da-DK')} g · Krav lvl {o.minLevel}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    title={why}
                    onClick={() => buySword(o.tier)}
                    className="min-h-[44px] px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm shrink-0"
                  >
                    Køb
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'smelter' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <p className="text-slate-400 text-sm">
              Nuværende: <span className="text-slate-200 font-medium">{SMELTER_TIERS[state.smelterTier - 1]?.name}</span>
            </p>
            {nextSmelterCost != null && nextSmelterDef ? (
              <>
                <p className="text-slate-300">
                  Næste: <span className="font-semibold text-amber-100">{nextSmelterDef.name}</span> · Pris{' '}
                  {nextSmelterCost.toLocaleString('da-DK')} g
                </p>
                <button
                  type="button"
                  disabled={!goldOk(state, nextSmelterCost)}
                  title={!goldOk(state, nextSmelterCost) ? `Krav ikke opfyldt: ${nextSmelterCost} g kræves.` : ''}
                  onClick={buySmelter}
                  className="min-h-[44px] px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-bold text-slate-950 text-sm"
                >
                  Opgrader smelter
                </button>
              </>
            ) : (
              <p className="text-slate-500 text-sm">Smelter er på højeste tier.</p>
            )}
          </div>
        )}

        {tab === 'consumables' && (
          <ul className="space-y-3">
            {SHOP_CONSUMABLES.map((c) => {
              const ok = goldOk(state, c.price)
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{c.name}</div>
                    <p className="text-sm text-slate-400 mt-1">{c.description}</p>
                    <div className="text-sm text-amber-200/90 mt-1">Pris {c.price.toLocaleString('da-DK')} g</div>
                  </div>
                  <button
                    type="button"
                    disabled={!ok}
                    title={!ok ? `Krav ikke opfyldt: ${c.price} g kræves.` : ''}
                    onClick={() => buyConsumable(c.id)}
                    className="min-h-[44px] px-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-40 font-semibold text-white text-sm shrink-0"
                  >
                    Køb
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'inventory' && (
          <ul className="space-y-3">
            {SHOP_INVENTORY_PACKS.map((pack) => {
              const ok = goldOk(state, pack.price)
              const label =
                pack.gems > 0
                  ? `+${pack.gems} ædelsten-pladser`
                  : pack.materials > 0
                    ? `+${pack.materials} råvarer`
                    : `+${pack.tools} værktøjs-pladser`
              return (
                <li
                  key={pack.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{label}</div>
                    <div className="text-sm text-amber-200/90 mt-1">Pris {pack.price.toLocaleString('da-DK')} g</div>
                  </div>
                  <button
                    type="button"
                    disabled={!ok}
                    title={!ok ? `Krav ikke opfyldt: ${pack.price} g kræves.` : ''}
                    onClick={() => buyPack(pack.id)}
                    className="min-h-[44px] px-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-40 font-semibold text-white text-sm shrink-0"
                  >
                    Køb
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'charms' && (
          <ul className="space-y-3">
            {SHOP_CHARMS.map((ch) => {
              const owned = state.activeCharms.includes(ch.id)
              const canLevel = state.level >= ch.minLevel
              const canGold = goldOk(state, ch.price)
              const disabled = owned || !canLevel || !canGold
              const why = owned
                ? 'Allerede købt.'
                : !canLevel
                  ? `Krav ikke opfyldt: lvl ${ch.minLevel} kræves.`
                  : !canGold
                    ? `Krav ikke opfyldt: ${ch.price} g kræves.`
                    : ''
              return (
                <li
                  key={ch.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{ch.name}</div>
                    <p className="text-sm text-slate-400 mt-1">{ch.description}</p>
                    <div className="text-sm text-amber-200/90 mt-1">
                      Pris {ch.price.toLocaleString('da-DK')} g · Krav lvl {ch.minLevel}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    title={why}
                    onClick={() => buyCharm(ch.id)}
                    className="min-h-[44px] px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-semibold text-white text-sm shrink-0"
                  >
                    {owned ? 'Ejet' : 'Køb'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'blueprints' && <BlueprintShopTab state={state} dispatch={dispatch} />}

        {tab === 'sell' && <SellTab state={state} dispatch={dispatch} />}
      </div>
    </div>
  )
}
