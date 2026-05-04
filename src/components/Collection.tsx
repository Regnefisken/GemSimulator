import type { Gem } from '../types'
import GemCard from './GemCard'

type Props = {
  gems: Gem[]
  onSelect: (gem: Gem) => void
  onClear: () => void
}

export default function Collection({ gems, onSelect, onClear }: Props) {
  return (
    <section className="pt-8 border-t border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold flex items-center gap-3">
          <span className="text-amber-400">✦</span>
          Din Samling
          <span className="text-slate-400 text-sm font-mono bg-slate-800 px-3 py-0.5 rounded-full">
            ({gems.length})
          </span>
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-4 py-2 text-slate-400 hover:text-slate-300 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6h12v12" />
          </svg>
          Ryd
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {gems.map((gem, i) => (
          <GemCard key={gem.id} gem={gem} isNewest={i === 0} onClick={() => onSelect(gem)} />
        ))}
      </div>
    </section>
  )
}
