import { useEffect, useState } from 'react'
import type { GameState, MetalName } from '../../types'
import type { Action } from '../../lib/gameState'
import { METALS } from '../../data/metals'
import { ESSENCE_IDS } from '../../data/essences'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
  onBeforeCraft: (firstGemIdBefore: string | undefined) => void
}

const MAX_INGOTS = 3

export default function GemCrafter({ state, dispatch, onBeforeCraft }: Props) {
  const [stoneId, setStoneId] = useState<string | null>(null)
  const [slots, setSlots] = useState<MetalName[]>([])
  const [roughEssenceId, setRoughEssenceId] = useState<string>('')
  const [polishing, setPolishing] = useState(false)

  useEffect(() => {
    if (!stoneId && state.roughStones[0]) setStoneId(state.roughStones[0].id)
  }, [stoneId, state.roughStones])

  const ingotOptions = state.metalIngots.filter((i) => i.quantity > 0)

  function toggleIngot(m: MetalName) {
    setSlots((prev) => {
      const idx = prev.indexOf(m)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      if (prev.length >= MAX_INGOTS) return prev
      return [...prev, m]
    })
  }

  function removeAt(i: number) {
    setSlots((prev) => prev.filter((_, j) => j !== i))
  }

  function canSlib() {
    return Boolean(stoneId) && !polishing && state.roughStones.some((s) => s.id === stoneId)
  }

  const dragonQ = state.essences.find((e) => e.essenceId === ESSENCE_IDS.dragonGlimmer)?.quantity ?? 0
  const runeQ = state.essences.find((e) => e.essenceId === ESSENCE_IDS.runeDust)?.quantity ?? 0

  function runSlib() {
    if (!stoneId || polishing) return
    const firstGemIdBefore = state.gems[0]?.id
    setPolishing(true)
    window.setTimeout(() => {
      onBeforeCraft(firstGemIdBefore)
      dispatch({
        type: 'CRAFT_GEM_FROM_ROUGH',
        stoneId,
        ingotSelection: [...slots],
        essenceId: roughEssenceId || undefined,
      })
      setSlots([])
      setRoughEssenceId('')
      setPolishing(false)
    }, 1500)
  }

  return (
    <section className="rounded-2xl border border-amber-900/50 bg-slate-900/80 p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">💎 Slibebord</h2>
      <p className="text-slate-400 text-sm mb-4">Vælg en rå klippe og op til tre metalbarer til inklusioner.</p>
      {state.roughCraftPurityBonus > 0 && (
        <p className="mb-3 text-sm text-amber-200/95 bg-amber-950/30 border border-amber-800/50 rounded-lg px-3 py-2">
          Slibesten aktiv: +{state.roughCraftPurityBonus} renhed på næste slibning (maks. 4).
        </p>
      )}

      {state.roughStones.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen rå klipper — find dem i minen.</p>
      ) : (
        <>
          <label className="block text-xs text-slate-400 mb-1">Rå klippe</label>
          <select
            value={stoneId ?? ''}
            onChange={(e) => setStoneId(e.target.value || null)}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm mb-4"
          >
            {state.roughStones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.paletteName} ({s.quality})
              </option>
            ))}
          </select>

          <div className="mb-2 text-xs text-slate-400">Metalbarer (max {MAX_INGOTS})</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {ingotOptions.map((i) => (
              <button
                key={i.metalName}
                type="button"
                disabled={polishing || (!slots.includes(i.metalName) && slots.length >= MAX_INGOTS)}
                onClick={() => toggleIngot(i.metalName)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  slots.includes(i.metalName)
                    ? 'bg-amber-600/30 border-amber-500 text-amber-100'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-40`}
              >
                {METALS[i.metalName].icon} {i.metalName}
              </button>
            ))}
          </div>
          {slots.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 text-sm text-slate-300">
              Rækkefølge:
              {slots.map((m, idx) => (
                <button
                  key={`${m}-${idx}`}
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600"
                  title="Fjern"
                >
                  {METALS[m].icon} {m} ×
                </button>
              ))}
            </div>
          )}

          <label className="block text-xs text-slate-400 mb-1">Valgfri essens ved slibning</label>
          <select
            value={roughEssenceId}
            onChange={(e) => setRoughEssenceId(e.target.value)}
            disabled={polishing}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm mb-4"
          >
            <option value="">Ingen</option>
            {dragonQ > 0 && (
              <option value={ESSENCE_IDS.dragonGlimmer}>
                Drageglimmer ({dragonQ}) — garanteret Ild-magi
              </option>
            )}
            {runeQ > 0 && (
              <option value={ESSENCE_IDS.runeDust}>
                Runedrys ({runeQ}) — mindst to magiske egenskaber
              </option>
            )}
          </select>

          <button
            type="button"
            disabled={!canSlib()}
            onClick={runSlib}
            className={`min-h-[48px] w-full sm:w-auto px-8 rounded-xl font-bold text-white transition-all ${
              polishing
                ? 'bg-violet-800 animate-pulse cursor-wait'
                : 'bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {polishing ? 'Sliber…' : 'Slib ædelsten'}
          </button>
        </>
      )}
    </section>
  )
}
