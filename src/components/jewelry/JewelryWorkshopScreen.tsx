import { useEffect, useState } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { JEWELRY_RECIPES, gemMatchesRecipe, recipeIngotRequirements } from '../../data/jewelry'
import { METALS } from '../../data/metals'
import { ESSENCE_IDS, getDailyEssenceMarketOffers, getEssenceDef } from '../../data/essences'
import { playGoldSpend } from '../../lib/sounds'
import PixelItemCard from '../PixelItemCard'
import EssenceChamber from './EssenceChamber'

type WorkshopTab = 'workshop' | 'chamber' | 'market'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
  onBack: () => void
}

function ingotSummary(recipe: (typeof JEWELRY_RECIPES)[number]): string {
  return recipeIngotRequirements(recipe)
    .map(({ metalName, quantity }) => `${quantity}× ${METALS[metalName].icon} ${metalName}`)
    .join(' · ')
}

export default function JewelryWorkshopScreen({ state, dispatch, onBack }: Props) {
  const unlocked = state.unlockedLocations.includes('smykkevaerkstedet')
  const [tab, setTab] = useState<WorkshopTab>('workshop')
  const [recipeId, setRecipeId] = useState<string>(JEWELRY_RECIPES[0]?.id ?? '')
  const [gemId, setGemId] = useState<string>('')
  const [jewelryEssenceId, setJewelryEssenceId] = useState<string>('')

  const recipe = JEWELRY_RECIPES.find((r) => r.id === recipeId)
  const eligibleGems = recipe ? state.gems.filter((g) => gemMatchesRecipe(g, recipe)) : []

  useEffect(() => {
    if (!recipeId || !gemId) return
    const r = JEWELRY_RECIPES.find((x) => x.id === recipeId)
    if (!r) return
    const gem = state.gems.find((g) => g.id === gemId)
    if (!gem || !gemMatchesRecipe(gem, r)) setGemId('')
  }, [recipeId, gemId, state.gems])

  function craft() {
    if (!recipe || !gemId) return
    dispatch({
      type: 'CRAFT_JEWELRY',
      recipeId: recipe.id,
      gemId,
      essenceId: jewelryEssenceId || undefined,
    })
  }

  function sell(id: string) {
    dispatch({ type: 'SELL_JEWELRY', id })
  }

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
        >
          ← Tilbage til kortet
        </button>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <p className="text-4xl mb-4">💍</p>
          <h2 className="text-xl font-bold text-slate-100">Smykkeværkstedet er låst</h2>
          <p className="text-slate-400 mt-2 text-sm">Krav: lvl 8 · Omdømme 5.</p>
        </div>
      </div>
    )
  }

  const canCraftRecipe = recipe && state.level >= recipe.level
  const needs = recipe ? recipeIngotRequirements(recipe) : []
  const hasIngots = needs.every(({ metalName, quantity }) => {
    const row = state.metalIngots.find((i) => i.metalName === metalName)
    return row && row.quantity >= quantity
  })

  const aetherQty = state.essences.find((s) => s.essenceId === ESSENCE_IDS.aetherMote)?.quantity ?? 0

  return (
    <div className="space-y-8 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
      >
        ← Tilbage til kortet
      </button>

      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>💍</span> Smykkeværkstedet
        </h2>
        <p className="text-slate-500 text-sm mt-1">Kombinér ædelsten og metalbarer. Essenser, marked og salg.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
        {(
          [
            ['workshop', 'Smedning'],
            ['chamber', 'Essenskammer'],
            ['market', 'Essensmarked'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold ${
              tab === id
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'chamber' && <EssenceChamber state={state} dispatch={dispatch} />}

      {tab === 'market' && (
        <section className="rounded-2xl border border-amber-900/40 bg-slate-900/80 p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-amber-100">Dagens essensmarked</h3>
          <p className="text-slate-400 text-sm">Priser skifter ved midnat (lokal tid). Gyldige tilbud valideres ved køb.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {getDailyEssenceMarketOffers().map((o) => {
              const def = getEssenceDef(o.essenceId)
              const canBuy = state.gold >= o.price
              return (
                <li
                  key={o.essenceId}
                  className="rounded-xl border border-slate-600 bg-slate-800/50 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{def?.icon ?? '✧'}</span>
                    <span className="font-semibold text-slate-100">{def?.name ?? o.essenceId}</span>
                  </div>
                  <p className="text-xs text-slate-500">{def?.description}</p>
                  <p className="text-amber-200 font-mono text-sm">{o.price} g</p>
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => {
                      playGoldSpend()
                      dispatch({ type: 'BUY_ESSENCE_MARKET', essenceId: o.essenceId, price: o.price })
                    }}
                    className="min-h-[44px] rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm"
                  >
                    Køb
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {tab === 'workshop' && (
        <>
      <section className="rounded-2xl border border-violet-900/40 bg-slate-900/80 p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-semibold text-violet-100">Lav smykke</h3>

        <label className="block text-xs text-slate-400 mb-1">Opskrift</label>
        <select
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
          className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
        >
          {JEWELRY_RECIPES.map((r) => {
            const locked = state.level < r.level
            return (
              <option key={r.id} value={r.id} disabled={false}>
                {r.name} — lvl {r.level}
                {locked ? ' (for lav level)' : ''} — {r.goldValue} g / +{r.reputation} omdømme
              </option>
            )
          })}
        </select>

        {recipe && (
          <div className="text-sm text-slate-400 space-y-1">
            <p>
              Krav: Ædelsten med renhed ≥ {recipe.requires.gemPurityMin}
              {recipe.requires.gemMagicMin != null
                ? ` · magi ≥ ${recipe.requires.gemMagicMin}`
                : ''}
            </p>
            <p>Forbrug: {ingotSummary(recipe)}</p>
            <p>Belønning: {recipe.goldValue} g · +{recipe.reputation} omdømme · +25 XP</p>
            {!canCraftRecipe && (
              <p className="text-amber-400">Krav ikke opfyldt: lvl {recipe.level} kræves.</p>
            )}
            {canCraftRecipe && !hasIngots && (
              <p className="text-amber-400">Mangler metalbarer i Lager {'>'} Råvarer.</p>
            )}
          </div>
        )}

        <label className="block text-xs text-slate-400 mb-1">Ædelsten (filtreret efter opskrift)</label>
        {recipe && eligibleGems.length === 0 ? (
          <p className="text-slate-500 text-sm">Ingen ædelsten opfylder kravene — brug en renere eller med mere magi.</p>
        ) : (
          <select
            value={gemId}
            onChange={(e) => setGemId(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Vælg ædelsten…</option>
            {eligibleGems.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — renhed {g.purity} · {g.magicProperties.length} magi
              </option>
            ))}
          </select>
        )}

        <label className="block text-xs text-slate-400 mb-1">Valgfri essens (Æterisk kime: +10% salgsværdi i guld)</label>
        <select
          value={jewelryEssenceId}
          onChange={(e) => setJewelryEssenceId(e.target.value)}
          className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
        >
          <option value="">Ingen</option>
          {aetherQty > 0 && (
            <option value={ESSENCE_IDS.aetherMote}>
              Æterisk kime ({aetherQty}) — +10% guld
            </option>
          )}
        </select>

        <button
          type="button"
          disabled={!recipe || !gemId || !canCraftRecipe || !hasIngots}
          title={
            !recipe || !gemId
              ? 'Vælg opskrift og sten.'
              : !canCraftRecipe
                ? `Krav ikke opfyldt: lvl ${recipe.level} kræves.`
                : !hasIngots
                  ? 'Mangler metalbarer i Lager > Råvarer.'
                  : ''
          }
          onClick={craft}
          className="min-h-[48px] w-full sm:w-auto px-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-bold text-white"
        >
          Lav smykke (+25 XP)
        </button>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Dine smykker — Adelsmarkedet</h3>
        {state.jewelry.length === 0 ? (
          <p className="text-slate-500 text-sm">Du har ingen smykker endnu.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.jewelry.map((j) => (
              <li
                key={j.id}
                className="rounded-xl border border-slate-600 bg-slate-800/40 p-4 flex flex-col gap-3"
              >
                <PixelItemCard item={j.pixelItem} label={j.name} subtitle={`Fra: ${j.gemUsed.name}`} rareGlow />
                <div className="text-xs text-slate-400 space-y-1">
                  <p>
                    Salgspris: <span className="text-amber-200 font-semibold">{j.goldValue} g</span> · +
                    {j.reputationValue} omdømme
                  </p>
                  <p className="text-slate-500">Lavet {j.timestamp}</p>
                </div>
                <button
                  type="button"
                  onClick={() => sell(j.id)}
                  className="min-h-[44px] rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm"
                >
                  Sælg på Adelsmarkedet (+15 XP)
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      )}
    </div>
  )
}
