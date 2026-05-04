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

  const isRadioaktiv = gem.magicProperty?.name === 'Radioaktiv'
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
      <div className="text-xs font-medium text-center leading-tight text-slate-300 group-hover:text-white">
        {displayName}
        {gem.magicProperty && (
          <div
            className={`text-[10px] mt-1 font-bold ${isRadioaktiv ? 'text-lime-400 animate-pulse' : 'text-slate-400'}`}
          >
            {gem.magicProperty.icon} {gem.magicProperty.name}
          </div>
        )}
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-1">{gem.timestamp}</div>
    </div>
  )
}
