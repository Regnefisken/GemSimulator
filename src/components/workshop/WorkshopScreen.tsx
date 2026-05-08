import { useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { ALCHEMY_RECIPES } from '../../data/alchemyRecipes'
import { findBrew } from '../../data/brews'
import { CONSUMABLE_DEFS, findConsumableDef, type WorkshopTabId } from '../../data/consumables'
import { computeWorldTier } from '../../lib/worldTier'
import { playGoldSpend } from '../../lib/sounds'
import VoxelScene from '../VoxelScene'

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
  onBack: () => void
}

const TAB_LABELS: Record<WorkshopTabId, string> = {
  food: 'Mad',
  potion: 'Potions',
  ingredient: 'Ingredienser',
}

export default function WorkshopScreen({ state, dispatch, onBack }: Props) {
  const [tab, setTab] = useState<WorkshopTabId>('food')

  const defs = CONSUMABLE_DEFS.filter((d) => d.tab === tab)

  const worldTier = useMemo(() => computeWorldTier(state), [state.depth, state.unlockedDepths])

  const visibleRecipes = useMemo(
    () => ALCHEMY_RECIPES.filter((r) => state.unlockedAlchemyRecipes.includes(r.id)),
    [state.unlockedAlchemyRecipes],
  )

  function buy(id: string) {
    playGoldSpend()
    dispatch({ type: 'BUY_WORKSHOP_CONSUMABLE', consumableId: id, quantity: 1 })
  }

  function craft(recipeId: string) {
    dispatch({ type: 'CRAFT_ALCHEMY_RECIPE', recipeId })
  }

  function ingredientLine(consumableId: string, qty: number): string {
    const def = findConsumableDef(consumableId)
    const owned = state.hubInventory.consumables.find((c) => c.consumableId === consumableId)?.quantity ?? 0
    return `${def?.name ?? consumableId} ×${qty} (har ${owned})`
  }

  return (
    <div className="space-y-6 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
      >
        ← Tilbage til kortet
      </button>

      <div className="rounded-2xl border border-emerald-900/40 bg-slate-900/90 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-emerald-100 flex items-center gap-2">⚗️ Alkymistværkstedet</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Guld: <span className="text-amber-200 font-mono font-semibold">{state.hubInventory.gold}</span> · Hylderne fyldes
              op igen når du forlader minen.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-violet-800/40 bg-slate-950/70 p-4 mb-6">
          <h2 className="text-sm font-bold text-violet-200 mb-2">Bland eliksirer</h2>
          {state.activeBrewId && (
            <p className="text-xs text-sky-300/95 mb-2 rounded-md border border-sky-800/50 bg-sky-950/40 px-2 py-1.5">
              Aktiv bryg (fx fra gemt run):{' '}
              <span className="font-semibold">{findBrew(state.activeBrewId)?.name ?? state.activeBrewId}</span> — nulstilles i
              hub (D36).
            </p>
          )}
          <p className="text-xs text-slate-500 mb-3">
            World tier <span className="font-mono text-slate-300">{worldTier}</span> (D10). Opskrifter låses bl.a.
            op via kiste-blueprints — smykke-blueprints er et andet system (§8b).
          </p>
          {visibleRecipes.length === 0 ? (
            <p className="text-sm text-slate-500">Ingen alkymi-opskrifter endnu.</p>
          ) : (
            <ul className="space-y-3">
              {visibleRecipes.map((rec) => {
                const outDef = findConsumableDef(rec.outputConsumableId)
                const tierOk = worldTier >= rec.requiredWorldTier
                const entries = Object.entries(rec.ingredients).filter(([, q]) => (q ?? 0) > 0)
                const hasAll = entries.every(([id, q]) => {
                  const need = q ?? 0
                  const row = state.hubInventory.consumables.find((c) => c.consumableId === id)
                  return row != null && row.quantity >= need
                })
                const canCraft = tierOk && hasAll
                return (
                  <li
                    key={rec.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/60 p-3"
                  >
                    <div className="w-14 h-14 shrink-0 rounded-lg bg-slate-900 overflow-hidden border border-slate-600/50">
                      {outDef && (
                        <VoxelScene
                          data={outDef.pixelItem.data}
                          colorMap={outDef.pixelItem.colorMap}
                          className="!block !max-w-none scale-90"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-slate-100">{rec.name}</p>
                      <p className="text-xs text-slate-500">{rec.description}</p>
                      <ul className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                        {entries.map(([id, q]) => (
                          <li key={`${rec.id}-${id}`}>{ingredientLine(id, q ?? 0)}</li>
                        ))}
                      </ul>
                      {!tierOk && (
                        <p className="text-[11px] text-amber-400 mt-1">
                          Kræver world tier {rec.requiredWorldTier}+
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!canCraft}
                      onClick={() => craft(rec.id)}
                      className="min-h-[44px] px-4 rounded-lg bg-violet-800/80 hover:bg-violet-700/90 disabled:opacity-40 disabled:cursor-not-allowed text-violet-50 text-sm font-semibold border border-violet-600/40"
                    >
                      Bland
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['food', 'potion', 'ingredient'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                'px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ' +
                (tab === id
                  ? 'bg-emerald-600 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
              }
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {defs.map((d) => {
            const stock = state.workshopStock[d.id] ?? 0
            const canBuy = state.hubInventory.gold >= d.price && stock > 0
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3"
              >
                <div className="w-[72px] h-[72px] shrink-0 rounded-lg bg-slate-900 overflow-hidden border border-slate-600/50">
                  <VoxelScene
                    data={d.pixelItem.data}
                    colorMap={d.pixelItem.colorMap}
                    className="!block !max-w-none scale-90"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="font-semibold text-slate-100">{d.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    På hylden: <span className="font-mono text-emerald-200">{stock}</span> · Pris{' '}
                    <span className="font-mono text-amber-200">{d.price}</span> guld
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => buy(d.id)}
                  className="min-h-[44px] px-4 rounded-lg bg-emerald-800/80 hover:bg-emerald-700/90 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-50 text-sm font-semibold border border-emerald-600/40"
                >
                  Køb
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
