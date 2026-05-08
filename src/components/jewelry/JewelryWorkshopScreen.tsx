import { useEffect, useMemo, useState } from 'react'
import type { BlueprintCategory, GameState, Gem, Jewelry } from '../../types'
import type { Action } from '../../lib/gameState'
import {
  blueprintIngotRequirements,
  gemMatchesBlueprint,
  makeJewelryPixelItemV2,
  primaryMetalForBlueprint,
} from '../../data/jewelry'
import { BLUEPRINTS, findBlueprint } from '../../data/blueprints'
import { METALS } from '../../data/metals'
import { ESSENCE_IDS, getDailyEssenceMarketOffers, getEssenceDef } from '../../data/essences'
import { playGoldSpend } from '../../lib/sounds'
import PixelItemCard from '../PixelItemCard'
import EssenceChamber from './EssenceChamber'
import JewelryViewer from './JewelryViewer'
import JewelryDetailModal from './JewelryDetailModal'

type WorkshopTab = 'workshop' | 'chamber' | 'market'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
  onBack: () => void
}

const CATEGORY_ORDER: BlueprintCategory[] = [
  'ring',
  'necklace',
  'earring',
  'bracelet',
  'brooch',
  'headpiece',
  'amulet',
]

const CATEGORY_LABEL: Record<BlueprintCategory, string> = {
  ring: 'Ringe',
  necklace: 'Halskæder',
  earring: 'Øreringe',
  bracelet: 'Armbånd',
  brooch: 'Brocher',
  headpiece: 'Hovedsmykker',
  amulet: 'Amuletter',
}

function ingotSummaryBlueprint(bp: ReturnType<typeof findBlueprint>): string {
  if (!bp) return ''
  return blueprintIngotRequirements(bp)
    .map(({ metalName, quantity }) => `${quantity}× ${METALS[metalName].icon} ${metalName}`)
    .join(' · ')
}

export default function JewelryWorkshopScreen({ state, dispatch, onBack }: Props) {
  const unlocked = state.unlockedLocations.includes('smykkevaerkstedet')
  const [tab, setTab] = useState<WorkshopTab>('workshop')
  const [blueprintId, setBlueprintId] = useState<string>('simple_band')
  const [selectedGemIds, setSelectedGemIds] = useState<string[]>([''])
  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d')
  const [jewelryEssenceId, setJewelryEssenceId] = useState<string>('')
  const [detailJewelry, setDetailJewelry] = useState<Jewelry | null>(null)

  const unlockedBlueprints = useMemo(
    () =>
      BLUEPRINTS.filter((b) => state.unlockedBlueprints.includes(b.id)).sort((a, b) => {
        const lc = a.requires.level - b.requires.level
        if (lc !== 0) return lc
        return a.name.localeCompare(b.name, 'da')
      }),
    [state.unlockedBlueprints],
  )

  useEffect(() => {
    if (unlockedBlueprints.length === 0) return
    if (!unlockedBlueprints.some((b) => b.id === blueprintId)) {
      setBlueprintId(unlockedBlueprints[0]!.id)
    }
  }, [unlockedBlueprints, blueprintId])

  const bp = findBlueprint(blueprintId)

  useEffect(() => {
    if (!bp) return
    setSelectedGemIds(Array.from({ length: bp.gemSlots }, () => ''))
  }, [blueprintId, bp?.gemSlots])

  const eligibleForSlot = (slotIndex: number) => {
    if (!bp) return []
    return state.gems.filter((g) => {
      if (!gemMatchesBlueprint(g, bp)) return false
      return !selectedGemIds.some((id, i) => i !== slotIndex && id !== '' && id === g.id)
    })
  }

  const previewGems = useMemo(() => {
    if (!bp) return []
    return selectedGemIds.map((id) => state.gems.find((g) => g.id === id)).filter(Boolean) as Gem[]
  }, [bp, selectedGemIds, state.gems])

  const previewPixelItem = useMemo(() => {
    if (!bp || previewGems.length === 0) return null
    return makeJewelryPixelItemV2(bp.id, previewGems, primaryMetalForBlueprint(bp))
  }, [bp, previewGems])

  function setSlotGem(slotIndex: number, gemId: string) {
    setSelectedGemIds((prev) => {
      const next = [...prev]
      while (next.length < (bp?.gemSlots ?? 0)) next.push('')
      next[slotIndex] = gemId
      return next
    })
  }

  function craft() {
    if (!bp) return
    if (selectedGemIds.some((id) => !id)) return
    dispatch({
      type: 'CRAFT_JEWELRY_V2',
      blueprintId: bp.id,
      gemIds: selectedGemIds.slice(0, bp.gemSlots),
      essenceId: jewelryEssenceId || undefined,
    })
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

  const canCraftBlueprint = bp && state.level >= bp.requires.level
  const needs = bp ? blueprintIngotRequirements(bp) : []
  const hasIngots = needs.every(({ metalName, quantity }) => {
    const row = state.metalIngots.find((i) => i.metalName === metalName)
    return row && row.quantity >= quantity
  })
  const allGemsPicked = bp ? selectedGemIds.slice(0, bp.gemSlots).every((id) => id !== '') : false

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
              const canBuy = state.hubInventory.gold >= o.price
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

            {unlockedBlueprints.length === 0 ? (
              <p className="text-slate-500 text-sm">Ingen blueprints låst op endnu.</p>
            ) : (
              <>
                <label className="block text-xs text-slate-400 mb-1">Blueprint</label>
                <select
                  value={blueprintId}
                  onChange={(e) => setBlueprintId(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
                >
                  {CATEGORY_ORDER.map((cat) => {
                    const inCat = unlockedBlueprints.filter((b) => b.category === cat)
                    if (inCat.length === 0) return null
                    return (
                      <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                        {inCat.map((b) => {
                          const locked = state.level < b.requires.level
                          return (
                            <option key={b.id} value={b.id}>
                              {b.icon} {b.name} — lvl {b.requires.level}
                              {locked ? ' (for lav level)' : ''} — {b.goldValue} g / +{b.reputation} omdømme
                            </option>
                          )
                        })}
                      </optgroup>
                    )
                  })}
                </select>

                {bp && (
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>
                      Krav: Ædelsten med renhed ≥ {bp.requires.gemPurityMin}
                      {bp.requires.gemMagicMin != null
                        ? ` · magi ≥ ${bp.requires.gemMagicMin}`
                        : ''}
                    </p>
                    <p>Forbrug: {ingotSummaryBlueprint(bp)}</p>
                    <p>
                      Belønning: {bp.goldValue} g · +{bp.reputation} omdømme · +25 XP
                    </p>
                    {!canCraftBlueprint && (
                      <p className="text-amber-400">Krav ikke opfyldt: lvl {bp.requires.level} kræves.</p>
                    )}
                    {canCraftBlueprint && !hasIngots && (
                      <p className="text-amber-400">Mangler metalbarer i Lager {'>'} Råvarer.</p>
                    )}
                    <p className="text-slate-500 text-xs">{bp.description}</p>
                  </div>
                )}

                {bp &&
                  Array.from({ length: bp.gemSlots }, (_, slotIndex) => {
                    const opts = eligibleForSlot(slotIndex)
                    return (
                      <div key={slotIndex}>
                        <label className="block text-xs text-slate-400 mb-1">
                          Ædelsten{bp.gemSlots > 1 ? ` ${slotIndex + 1}` : ''}
                          {bp.gemSlots > 1
                            ? ` (${slotIndex === 0 ? 'primær' : slotIndex === 1 ? 'sekundær' : 'tertiær'})`
                            : ''}
                        </label>
                        {opts.length === 0 ? (
                          <p className="text-slate-500 text-sm">
                            Ingen ædelsten opfylder kravene — brug en renere eller med mere magi.
                          </p>
                        ) : (
                          <select
                            value={selectedGemIds[slotIndex] ?? ''}
                            onChange={(e) => setSlotGem(slotIndex, e.target.value)}
                            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm"
                          >
                            <option value="">Vælg ædelsten…</option>
                            {opts.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name} — renhed {g.purity} · {g.magicProperties.length} magi
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}

                <label className="block text-xs text-slate-400 mb-1">
                  Valgfri essens (Æterisk kime: +10% salgsværdi i guld)
                </label>
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

                <div>
                  <span className="block text-xs text-slate-400 mb-2">Forhåndsvisning</span>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('2d')}
                      className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold ${
                        previewMode === '2d'
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      2D
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('3d')}
                      className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold ${
                        previewMode === '3d'
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      3D
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-600 bg-slate-950 min-h-[220px] flex items-center justify-center overflow-hidden p-2">
                    {previewMode === '2d' && previewPixelItem && bp && (
                      <PixelItemCard item={previewPixelItem} label="Preview" subtitle={bp.name} rareGlow />
                    )}
                    {previewMode === '2d' && !previewPixelItem && (
                      <p className="text-slate-500 text-sm text-center px-4">
                        Vælg ædelsten for at se 2D-preview.
                      </p>
                    )}
                    {previewMode === '3d' && bp && previewGems.length > 0 && (
                      <div className="w-full h-[280px] min-h-[220px]">
                        <JewelryViewer
                          blueprintId={bp.id}
                          gems={previewGems}
                          rimMetal={primaryMetalForBlueprint(bp)}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    {previewMode === '3d' && previewGems.length === 0 && (
                      <p className="text-slate-500 text-sm text-center px-4">
                        Vælg ædelsten for at se 3D-preview.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!bp || !allGemsPicked || !canCraftBlueprint || !hasIngots}
                  title={
                    !bp || !allGemsPicked
                      ? 'Vælg blueprint og alle ædelsten.'
                      : !canCraftBlueprint
                        ? `Krav ikke opfyldt: lvl ${bp.requires.level} kræves.`
                        : !hasIngots
                          ? 'Mangler metalbarer i Lager > Råvarer.'
                          : ''
                  }
                  onClick={craft}
                  className="min-h-[48px] w-full sm:w-auto px-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-bold text-white"
                >
                  Lav smykke (+25 XP)
                </button>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Dine smykker — Adelsmarkedet</h3>
            {state.jewelry.length === 0 ? (
              <p className="text-slate-500 text-sm">Du har ingen smykker endnu.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {state.jewelry.map((j) => {
                  const gemLine =
                    j.gemsUsed.length > 0 ? j.gemsUsed.map((x) => x.name).join(' · ') : j.gemUsed.name
                  return (
                    <li
                      key={j.id}
                      className="rounded-xl border border-slate-600 bg-slate-800/40 p-4 flex flex-col gap-3"
                    >
                      <PixelItemCard
                        item={j.pixelItem}
                        label={j.name}
                        subtitle={`Sten: ${gemLine}`}
                        rareGlow
                        onClick={() => setDetailJewelry(j)}
                      />
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>
                          Salgspris: <span className="text-amber-200 font-semibold">{j.goldValue} g</span> · +
                          {j.reputationValue} omdømme
                        </p>
                        <p className="text-slate-500">Lavet {j.timestamp}</p>
                        <p className="text-slate-500">Tryk på kortet for 3D / salg.</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <JewelryDetailModal
              jewelry={detailJewelry}
              open={detailJewelry !== null}
              gems={state.gems}
              dispatch={dispatch}
              onClose={() => setDetailJewelry(null)}
            />
          </section>
        </>
      )}
    </div>
  )
}
