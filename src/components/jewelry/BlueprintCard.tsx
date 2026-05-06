import type { Blueprint, Gem } from '../../types'
import { METALS } from '../../data/metals'
import {
  blueprintIngotRequirements,
  makeJewelryPixelItemV2,
  primaryMetalForBlueprint,
} from '../../data/jewelry'
import PixelItemCard from '../PixelItemCard'

function stubGemsForPreview(count: number): Gem[] {
  const colorMap = { G: '#e11d48', D: '#9f1239', L: '#fda4af', O: '#450a0a', W: '#fff1f2' }
  return Array.from({ length: count }, (_, i) => ({
    id: `preview-stub-${i}`,
    name: 'Rubin',
    shapeName: 'Brilliant',
    paletteName: 'Rubin',
    purity: 4,
    karat: null,
    data: [],
    colorMap,
    timestamp: '',
    isGodTier: false,
    metalInclusions: [],
    magicProperties: Array.from({ length: Math.max(2, i + 1) }, (_, m) => ({
      name: `M${m}`,
      icon: '✦',
      color: '#fff',
      glow: '#fff',
      rarity: 'common' as const,
    })),
    goldValue: 0,
  }))
}

function ingotLine(bp: Blueprint): string {
  return blueprintIngotRequirements(bp)
    .map(({ metalName, quantity }) => `${quantity}× ${METALS[metalName].icon}`)
    .join(' ')
}

type Props = {
  blueprint: Blueprint
  owned: boolean
  levelOk: boolean
  goldOk: boolean
  onBuyShop: () => void
}

export default function BlueprintCard({ blueprint: bp, owned, levelOk, goldOk, onBuyShop }: Props) {
  const rimMetal = primaryMetalForBlueprint(bp)
  const previewItem = makeJewelryPixelItemV2(bp.id, stubGemsForPreview(bp.gemSlots), rimMetal)
  const shop = bp.unlockMethod === 'shop'
  const canBuy = shop && !owned && levelOk && goldOk
  const priceLabel =
    bp.shopPrice > 0 ? `${bp.shopPrice.toLocaleString('da-DK')} g` : 'Gratis'

  return (
    <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <PixelItemCard
          item={previewItem}
          label={bp.name}
          subtitle={`${bp.icon} ${bp.category}`}
          rareGlow={false}
        />
        <div className="flex-1 min-w-0 space-y-1 text-sm">
          <p className="text-slate-400">
            Krav: lvl {bp.requires.level} · renhed ≥ {bp.requires.gemPurityMin}
            {bp.requires.gemMagicMin != null ? ` · magi ≥ ${bp.requires.gemMagicMin}` : ''}
          </p>
          <p className="text-slate-500 text-xs">Forbrug: {ingotLine(bp)}</p>
          <p className="text-slate-500 text-xs line-clamp-2">{bp.description}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-700/80">
        <div className="text-xs text-slate-400">
          {owned && <span className="text-emerald-400 font-semibold">Ejet</span>}
          {!owned && bp.unlockMethod === 'starter' && <span>Starter</span>}
          {!owned && bp.unlockMethod === 'achievement' && <span>Låses op via præstation</span>}
          {!owned && bp.unlockMethod === 'mine-loot' && <span>Sjælden mine-drop</span>}
          {!owned && shop && !levelOk && <span className="text-amber-400">Kræver lvl {bp.requires.level}</span>}
          {!owned && shop && levelOk && !goldOk && bp.shopPrice > 0 && (
            <span className="text-amber-400">Mangler guld ({priceLabel})</span>
          )}
        </div>
        {shop && !owned && (
          <button
            type="button"
            disabled={!canBuy}
            title={
              !levelOk
                ? `Kræver level ${bp.requires.level}`
                : !goldOk && bp.shopPrice > 0
                  ? `Kræver ${bp.shopPrice} g`
                  : ''
            }
            onClick={onBuyShop}
            className="min-h-[44px] px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-bold text-slate-950 text-sm shrink-0"
          >
            Køb ({priceLabel})
          </button>
        )}
      </div>
    </div>
  )
}
