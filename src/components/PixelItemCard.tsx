import { useEffect, useRef } from 'react'
import { drawGem } from '../gem/draw2d'
import type { PixelItem } from '../types'

export type PixelItemCardProps = {
  item: PixelItem
  label: string
  subtitle?: string
  count?: number
  onClick?: () => void
  highlighted?: boolean
  /** Ekstra ramme (fx metalklumper). */
  rareGlow?: boolean
}

export default function PixelItemCard({
  item,
  label,
  subtitle,
  count,
  onClick,
  highlighted,
  rareGlow,
}: PixelItemCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasPixels = item.data.length > 0 && item.data[0]?.length

  useEffect(() => {
    const c = canvasRef.current
    if (c && hasPixels) drawGem(c, item.data, item.colorMap, 4)
  }, [item, hasPixels])

  const borderClass = rareGlow
    ? 'border-amber-400/50 ring-2 ring-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
    : highlighted
      ? 'border-violet-500/70 ring-2 ring-violet-400/50'
      : 'border-slate-600 hover:border-slate-500'

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={
        'bg-slate-800/70 rounded-2xl border p-3 flex flex-col items-center transition-all ' +
        borderClass +
        (onClick ? ' cursor-pointer hover:bg-slate-700/80' : '')
      }
    >
      {hasPixels ? (
        <canvas ref={canvasRef} width={64} height={64} className="pixelated mb-2" />
      ) : (
        <div className="w-16 h-16 mb-2 rounded-lg bg-slate-900 border border-slate-600 flex items-center justify-center text-slate-500 text-[10px]">
          —
        </div>
      )}
      <div className="text-xs font-medium text-center text-slate-200 leading-tight">{label}</div>
      {subtitle && <div className="text-[10px] text-slate-500 mt-0.5 text-center">{subtitle}</div>}
      {count !== undefined && (
        <div className="text-[11px] font-mono text-amber-400/90 mt-1">×{count}</div>
      )}
    </div>
  )
}
