import { useMemo, useState } from 'react'
import type { Gem, GameState } from '../../types'
import GemCard from '../GemCard'
import GemPreviewModal from './GemPreviewModal'

function CapacityLine({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  return (
    <div className="text-xs text-slate-400 mb-4">
      <div className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-slate-300">
          {used} / {max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function GemInventoryTab({ state }: { state: GameState }) {
  const [preview, setPreview] = useState<Gem | null>(null)
  const cap = state.inventoryCapacity.gems
  const used = state.gems.length
  const gems = useMemo(() => state.gems, [state.gems])

  return (
    <div>
      <CapacityLine used={used} max={cap} label="Ædelsten-plads" />
      {state.gems.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen ædelsten endnu.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {gems.map((gem, i) => (
            <GemCard key={gem.id} gem={gem} isNewest={i === 0} onClick={() => setPreview(gem)} />
          ))}
        </div>
      )}
      <GemPreviewModal gem={preview} open={preview !== null} onClose={() => setPreview(null)} />
    </div>
  )
}
