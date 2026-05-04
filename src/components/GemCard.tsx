import { useEffect, useRef } from 'react'
import { drawGem } from '../gem/draw2d'
import type { Gem } from '../types'

type Props = { gem: Gem; isNewest: boolean; onClick: () => void }

export default function GemCard({ gem, isNewest, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (c) drawGem(c, gem.data, gem.colorMap, 5)
  }, [gem])

  const isRadioaktiv = gem.magicProperties.some((m) => m.name === 'Radioaktiv')
  const borderClass = isRadioaktiv
    ? 'border-lime-500/50 hover:border-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.3)]'
    : 'border-slate-700 hover:border-slate-500'

  let displayName = gem.name
  if (gem.purity === 4 && gem.karat) displayName = `★★★★ ${gem.karat}K ${displayName}`
  else if (gem.purity === 3) displayName = `★★★ ${displayName}`
  else if (gem.purity === 1) displayName = `★ ${displayName}`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group bg-slate-800/70 hover:bg-slate-700 border rounded-2xl p-3 cursor-pointer transition-all flex flex-col items-center ${borderClass} ${isNewest ? 'ring-2 ring-amber-400/60' : ''}`}
    >
      <canvas
        ref={canvasRef}
        width={80}
        height={80}
        className="pixelated mb-3 group-hover:scale-105 transition-transform"
      />
      <div className="text-xs font-medium text-center leading-tight text-slate-300 group-hover:text-white w-full">
        {displayName}
        {gem.metalInclusions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-1.5 text-base leading-none" aria-label="Metal">
            {gem.metalInclusions.map((inc) => (
              <span key={`${gem.id}-m-${inc.name}`} title={`${inc.name}: ${inc.effect}`}>
                {inc.icon}
              </span>
            ))}
          </div>
        )}
        {gem.magicProperties.length > 0 && (
          <div
            className={`flex flex-wrap justify-center gap-1 mt-1.5 ${isRadioaktiv ? 'text-lime-400' : 'text-slate-400'}`}
          >
            {gem.magicProperties.map((m) => (
              <span
                key={`${gem.id}-${m.name}`}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-600/80 ${m.color}`}
              >
                {m.icon}
              </span>
            ))}
          </div>
        )}
        <div className="text-[11px] font-semibold text-amber-400/95 mt-1.5 flex items-center justify-center gap-1">
          <span aria-hidden>🪙</span>
          {gem.goldValue}
        </div>
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-1">{gem.timestamp}</div>
    </div>
  )
}
