import { METALS } from '../../data/metals'
import type { MetalName } from '../../types'

type Props = {
  slotCount: number
  activeIndex: number
  dominantMetal?: MetalName
  onSlotSelect?: (index: number) => void
}

/** Min. klikfelt så man kan skifte mål uden at ramme 8×8 px prikker (D13). */
const SLOT_HIT = 44

export default function MinimapHUD({ slotCount, activeIndex, dominantMetal, onSlotSelect }: Props) {
  const accent = dominantMetal ? METALS[dominantMetal]?.pixelColor ?? '#c97a50' : '#64748b'

  return (
    <div className="flex items-center justify-end gap-1 pointer-events-auto" role="toolbar" aria-label="Vælg malm-felt">
      {Array.from({ length: slotCount }).map((_, i) => {
        const active = i === activeIndex % slotCount
        const dot = active ? 14 : 10
        return (
          <button
            key={i}
            type="button"
            title={active ? 'Aktiv malm' : `Vælg felt ${i + 1}`}
            onClick={() => onSlotSelect?.(i)}
            className={
              'flex items-center justify-center shrink-0 rounded-full border border-transparent transition-all duration-200 cursor-pointer ' +
              'hover:bg-slate-800/90 hover:border-slate-600/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/70 focus-visible:outline-offset-2 ' +
              (active ? 'scale-105 bg-slate-800/50 border-slate-600/40' : 'opacity-90')
            }
            style={{ width: SLOT_HIT, height: SLOT_HIT }}
          >
            <span
              className={'rounded-full border-2 block ' + (active ? 'shadow-lg' : 'border-slate-600 bg-slate-700')}
              style={
                active
                  ? {
                      width: dot,
                      height: dot,
                      borderColor: accent,
                      backgroundColor: `${accent}55`,
                    }
                  : { width: dot, height: dot }
              }
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
