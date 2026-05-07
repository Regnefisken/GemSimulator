import { useEffect, useState, type ReactNode, type TransitionEvent } from 'react'
import type { MineDrop } from '../../gem/mining'
import type { ChestTier } from '../../types'
import { METALS } from '../../data/metals'
import { findConsumableDef } from '../../data/consumables'

/** UI-state for drop-banner (feature-local, not global `types.ts`). */
export type DropNotice = {
  id: number
  drop: MineDrop
  essenceId: string | null
  essenceName: string | null
  /** Valgfri blueprint fra guldkiste (Mithril / Rune). */
  chestBlueprintId?: string | null
  chestBlueprintName?: string | null
}

type Props = {
  notice: DropNotice
  onDone: () => void
  /** overlay = fuld bredde bund (legacy); inline = kompakt række ved siden af quick-slots */
  layout?: 'overlay' | 'inline'
}

function borderClassForChestTier(tier: ChestTier): string {
  switch (tier) {
    case 'wood':
      return 'border-amber-800/55'
    case 'silver':
      return 'border-slate-400/55'
    case 'gold':
      return 'border-amber-300/65'
  }
}

function borderClassForDrop(drop: MineDrop): string {
  switch (drop.kind) {
    case 'ore':
      return 'border-blue-700/60'
    case 'nugget':
      return 'border-yellow-700/60'
    case 'rough-stone':
      return 'border-slate-600/60'
    case 'gem':
      return 'border-fuchsia-600/70'
    case 'chest':
      return borderClassForChestTier(drop.tier)
    case 'blueprint':
      return 'border-violet-400/70'
    case 'coal':
      return 'border-stone-600/70'
    case 'consumable':
      return 'border-emerald-600/60'
    case 'nothing':
      return 'border-slate-700/40'
    default:
      return 'border-slate-700/40'
  }
}

function roughStoneQualityBadgeClass(quality: 'crude' | 'fine' | 'pristine'): string {
  switch (quality) {
    case 'crude':
      return 'text-slate-400'
    case 'fine':
      return 'text-emerald-300'
    case 'pristine':
      return 'text-amber-300'
    default:
      return 'text-slate-400'
  }
}

function roughStoneQualityLabel(quality: 'crude' | 'fine' | 'pristine'): string {
  switch (quality) {
    case 'crude':
      return 'grov'
    case 'fine':
      return 'fin'
    case 'pristine':
      return 'uberørt'
    default:
      return quality
  }
}

export default function RockDropBanner({ notice, onDone, layout = 'overlay' }: Props) {
  const { drop } = notice
  const [leaving, setLeaving] = useState(false)
  const inline = layout === 'inline'

  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), 2000)
    return () => window.clearTimeout(t)
  }, [])

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === 'opacity' && leaving) onDone()
  }

  let icon: string
  let title: ReactNode
  let badgeClass: string
  let badgeText: string

  switch (drop.kind) {
    case 'ore': {
      const name = METALS[drop.ore.metalName]?.name ?? drop.ore.metalName
      icon = '⛏️'
      title = (
        <>
          {drop.ore.quantity}× {name} malm
        </>
      )
      badgeClass = 'text-blue-300'
      badgeText = 'Malm'
      break
    }
    case 'nugget': {
      const name = METALS[drop.nugget.metalName]?.name ?? drop.nugget.metalName
      icon = '🔩'
      title = (
        <>
          {drop.nugget.quantity}× {name} klump
        </>
      )
      badgeClass = 'text-yellow-300'
      badgeText = 'Klump'
      break
    }
    case 'rough-stone': {
      const q = drop.stone.quality
      icon = '🪨'
      title = (
        <>
          Rå klippe (
          <span className={roughStoneQualityBadgeClass(q)}>{roughStoneQualityLabel(q)}</span>)
        </>
      )
      badgeClass = roughStoneQualityBadgeClass(q)
      badgeText = 'Rå klippe'
      break
    }
    case 'gem': {
      icon = '✦'
      title = 'Ædelsten fundet!'
      if (drop.gem.isGodTier) {
        badgeClass = 'text-fuchsia-300'
        badgeText = 'GUDDOMMELIG'
      } else {
        badgeClass = 'text-violet-300'
        badgeText = 'Sjælden'
      }
      break
    }
    case 'chest': {
      const tierLabel =
        drop.tier === 'wood' ? 'Træ' : drop.tier === 'silver' ? 'Sølv' : 'Guld'
      icon = '🎁'
      title = (
        <>
          {tierLabel}kiste åbnet! <span className="text-yellow-300 font-bold">+{drop.gold} guld</span>
        </>
      )
      badgeClass =
        drop.tier === 'silver'
          ? 'text-slate-200'
          : drop.tier === 'gold'
            ? 'text-amber-200'
            : 'text-yellow-300'
      badgeText = `${tierLabel}kiste`
      break
    }
    case 'blueprint': {
      icon = '📜'
      title = <>Blueprint: {drop.blueprintId}</>
      badgeClass = 'text-violet-300'
      badgeText = 'Blueprint'
      break
    }
    case 'coal': {
      icon = '⚫'
      title = (
        <>
          +{drop.quantity} Kul
        </>
      )
      badgeClass = 'text-stone-300'
      badgeText = 'Kul'
      break
    }
    case 'consumable': {
      const def = findConsumableDef(drop.consumableId)
      icon = '🧪'
      title = (
        <>
          {def?.name ?? drop.consumableId}
          {drop.quantity > 1 ? ` ×${drop.quantity}` : ''}
        </>
      )
      badgeClass = 'text-emerald-300'
      badgeText = def?.kind === 'potion' ? 'Potion' : 'Mad'
      break
    }
    case 'nothing':
    default:
      icon = '—'
      title = 'Ingen fund'
      badgeClass = 'text-slate-500'
      badgeText = '—'
      break
  }

  return (
    <div
      role="status"
      className={[
        inline
          ? 'relative z-10 w-full max-w-full min-w-0 rounded-lg border bg-slate-900/92 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 flex items-start gap-2'
          : 'absolute bottom-3 left-3 right-3 z-20 rounded-xl border bg-slate-900/90 backdrop-blur-sm px-4 py-3 flex items-start gap-3',
        'animate-drop-banner-enter',
        'transition-opacity duration-500',
        'pointer-events-none',
        borderClassForDrop(drop),
        leaving ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      onTransitionEnd={handleTransitionEnd}
    >
      <span
        className={
          inline
            ? 'text-base sm:text-lg shrink-0 leading-none pt-0.5'
            : 'text-xl shrink-0 leading-none pt-0.5'
        }
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5 sm:gap-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p
            className={
              inline
                ? 'text-[11px] sm:text-xs font-bold text-slate-100 leading-snug min-w-0 break-words'
                : 'text-sm font-bold text-slate-100 leading-snug'
            }
          >
            {title}
          </p>
          <span
            className={`font-semibold shrink-0 uppercase tracking-wide ${inline ? 'text-[9px] ' : 'text-xs '}${badgeClass}`}
          >
            {badgeText}
          </span>
        </div>
        {notice.essenceName != null && (
          <p className={inline ? 'text-[10px] text-cyan-300' : 'text-xs text-cyan-300'}>
            <span aria-hidden>🌟 </span>Essens: {notice.essenceName}
          </p>
        )}
        {notice.chestBlueprintName != null && (
          <p className={inline ? 'text-[10px] text-violet-300' : 'text-xs text-violet-300'}>
            <span aria-hidden>📜 </span>Kisten gemte også en tegning: {notice.chestBlueprintName}
          </p>
        )}
      </div>
    </div>
  )
}
