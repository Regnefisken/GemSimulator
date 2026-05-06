import { METALS } from '../../data/metals'
import type { MetalName } from '../../types'

type Props = {
  slotCount: number
  activeIndex: number
  dominantMetal?: MetalName
}

export default function MinimapHUD({ slotCount, activeIndex, dominantMetal }: Props) {
  const accent = dominantMetal ? METALS[dominantMetal]?.pixelColor ?? '#c97a50' : '#64748b'

  return (
    <div className="flex items-center justify-end gap-2">
      {Array.from({ length: slotCount }).map((_, i) => {
        const active = i === activeIndex % slotCount
        return (
          <div
            key={i}
            className={
              'rounded-full border-2 transition-all duration-300 ' +
              (active ? 'scale-125 shadow-lg' : 'scale-90 opacity-55 border-slate-600 bg-slate-700')
            }
            style={
              active
                ? {
                    width: 14,
                    height: 14,
                    borderColor: accent,
                    backgroundColor: `${accent}55`,
                  }
                : { width: 8, height: 8 }
            }
            title={active ? 'Aktiv malm' : 'Kommer senere'}
          />
        )
      })}
    </div>
  )
}
