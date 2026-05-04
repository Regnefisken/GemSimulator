import { useState, type Dispatch } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import PixelItemCard from '../PixelItemCard'
import ItemPreviewModal from './ItemPreviewModal'

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
          className="h-full rounded-full bg-slate-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function ToolsInventoryTab({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  const cap = state.inventoryCapacity.tools
  const used = state.pickaxes.length
  const preview = state.pickaxes.find((p) => p.id === previewId) ?? null

  return (
    <div>
      <CapacityLine used={used} max={cap} label="Redskaber (hakker)" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {state.pickaxes.map((p) => (
          <PixelItemCard
            key={p.id}
            item={p.pixelItem}
            label={p.name}
            subtitle={`${p.durability}/${p.maxDurability} · ${p.damage} skade`}
            highlighted={p.id === state.activePickaxeId}
            onClick={() => setPreviewId(p.id)}
          />
        ))}
      </div>

      {preview && (
        <ItemPreviewModal
          open
          onClose={() => setPreviewId(null)}
          item={preview.pixelItem}
          title={preview.name}
          subtitleLines={[
            `Skade: ${preview.damage}`,
            `Holdbarhed: ${preview.durability} / ${preview.maxDurability}`,
            `Tier: ${preview.tier}`,
            preview.id === state.activePickaxeId ? 'Status: Aktiv i minen' : 'Status: Ikke valgt',
          ]}
          footer={
            preview.id !== state.activePickaxeId ? (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_PICKAXE', id: preview.id })
                  setPreviewId(null)
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
              >
                Sæt som aktiv
              </button>
            ) : (
              <span className="text-sm text-emerald-400 font-medium">Aktiv hakke</span>
            )
          }
        />
      )}
    </div>
  )
}
