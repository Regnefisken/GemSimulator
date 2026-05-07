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
  const [previewKind, setPreviewKind] = useState<'pickaxe' | 'sword'>('pickaxe')
  const cap = state.inventoryCapacity.tools
  const used = state.pickaxes.length + state.swords.length
  const previewPick = previewKind === 'pickaxe' ? state.pickaxes.find((p) => p.id === previewId) ?? null : null
  const previewSw = previewKind === 'sword' ? state.swords.find((s) => s.id === previewId) ?? null : null
  const preview = previewPick ?? previewSw

  return (
    <div>
      <CapacityLine used={used} max={cap} label="Værktøj (hakker + sværd)" />
      <h3 className="text-sm font-semibold text-slate-200 mb-2">Hakker</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {state.pickaxes.map((p) => (
          <PixelItemCard
            key={p.id}
            item={p.pixelItem}
            label={p.name}
            subtitle={
              p.durability === 0
                ? '⚠️ Slidt op — reparér med kul i smedjen'
                : `${p.durability}/${p.maxDurability} · ${p.damage} skade`
            }
            highlighted={p.id === state.activePickaxeId}
            onClick={() => {
              setPreviewKind('pickaxe')
              setPreviewId(p.id)
            }}
          />
        ))}
      </div>

      <h3 className="text-sm font-semibold text-slate-200 mb-2">Sværd</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {state.swords.map((s) => (
          <PixelItemCard
            key={s.id}
            item={s.pixelItem}
            label={s.name}
            subtitle={
              s.durability === 0
                ? '⚠️ Slidt op — reparér med kul i smedjen'
                : `${s.durability}/${s.maxDurability} · ${s.damage} skade`
            }
            highlighted={s.id === state.activeSwordId}
            onClick={() => {
              setPreviewKind('sword')
              setPreviewId(s.id)
            }}
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
            previewKind === 'pickaxe'
              ? preview.id === state.activePickaxeId
                ? 'Status: Aktiv hakke i minen'
                : 'Status: Ikke valgt som aktiv hakke'
              : preview.id === state.activeSwordId
                ? 'Status: Aktivt sværd i minen'
                : 'Status: Ikke valgt som aktivt sværd',
          ]}
          footer={
            <div className="flex flex-col gap-3 w-full">
              {previewKind === 'pickaxe' && preview.id !== state.activePickaxeId ? (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_PICKAXE', id: preview.id })
                    setPreviewId(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
                >
                  Sæt som aktiv hakke
                </button>
              ) : previewKind === 'sword' && preview.id !== state.activeSwordId ? (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_SWORD', id: preview.id })
                    setPreviewId(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
                >
                  Sæt som aktivt sværd
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-emerald-400 font-medium">
                    {previewKind === 'pickaxe' ? 'Aktiv hakke' : 'Aktivt sværd'}
                  </span>
                  {preview.durability < preview.maxDurability && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gå til <strong className="text-amber-200/90">smedjen</strong> og brug reparationsbænken med{' '}
                      <strong className="text-amber-200/90">kul</strong>.
                    </p>
                  )}
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  )
}
