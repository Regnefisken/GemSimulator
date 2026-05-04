import { useState, type ReactNode } from 'react'
import type { GameState, PixelItem } from '../../types'
import PixelItemCard from '../PixelItemCard'
import ItemPreviewModal from './ItemPreviewModal'

const QUALITY_DK: Record<string, string> = {
  crude: 'Grov',
  fine: 'Fin',
  pristine: 'Ypperlig',
}

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
          className="h-full rounded-full bg-amber-600/80 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type Preview =
  | { kind: 'pixel'; title: string; subtitleLines: string[]; item: PixelItem }
  | null

export default function MaterialsInventoryTab({ state }: { state: GameState }) {
  const [preview, setPreview] = useState<Preview>(null)
  const cap = state.inventoryCapacity.materials
  const used =
    state.roughStones.length +
    state.rawOre.reduce((s, o) => s + o.quantity, 0) +
    state.metalNuggets.reduce((s, n) => s + n.quantity, 0) +
    state.metalIngots.reduce((s, i) => s + i.quantity, 0)

  const roughSorted = [...state.roughStones].sort((a, b) => {
    const r = { pristine: 0, fine: 1, crude: 2 }
    return r[a.quality] - r[b.quality]
  })

  function SectionTitle({ children }: { children: ReactNode }) {
    return <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mt-6 mb-2 first:mt-0">{children}</h3>
  }

  return (
    <div>
      <CapacityLine used={used} max={cap} label="Råvarer (samlet)" />

      <SectionTitle>Rå klipper</SectionTitle>
      {roughSorted.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {roughSorted.map((s) => (
            <PixelItemCard
              key={s.id}
              item={s.pixelItem}
              label={s.paletteName}
              subtitle={QUALITY_DK[s.quality] ?? s.quality}
              onClick={() =>
                setPreview({
                  kind: 'pixel',
                  title: `${s.paletteName} (${QUALITY_DK[s.quality] ?? s.quality})`,
                  subtitleLines: [`Palette: ${s.paletteName}`, `Kvalitet: ${QUALITY_DK[s.quality] ?? s.quality}`],
                  item: s.pixelItem,
                })
              }
            />
          ))}
        </div>
      )}

      <SectionTitle>Rå malm</SectionTitle>
      {state.rawOre.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {state.rawOre.map((o) => (
            <PixelItemCard
              key={o.metalName}
              item={o.pixelItem}
              label={o.metalName}
              subtitle="Rå malm"
              count={o.quantity}
              onClick={() =>
                setPreview({
                  kind: 'pixel',
                  title: `${o.metalName} (rå malm)`,
                  subtitleLines: [`Metal: ${o.metalName}`, `Antal: ${o.quantity}`],
                  item: o.pixelItem,
                })
              }
            />
          ))}
        </div>
      )}

      <SectionTitle>Metalklumper ★</SectionTitle>
      {state.metalNuggets.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen — sjældne drops fra minen.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {state.metalNuggets.map((n) => (
            <PixelItemCard
              key={n.metalName}
              item={n.pixelItem}
              label={n.metalName}
              subtitle="Ren klump"
              count={n.quantity}
              rareGlow
              onClick={() =>
                setPreview({
                  kind: 'pixel',
                  title: `${n.metalName} (metalklump)`,
                  subtitleLines: [`Sjælden ★`, `Metal: ${n.metalName}`, `Antal: ${n.quantity}`],
                  item: n.pixelItem,
                })
              }
            />
          ))}
        </div>
      )}

      <SectionTitle>Metal-ingots</SectionTitle>
      {state.metalIngots.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen — smelt malm i Smedjen (Fase 6).</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {state.metalIngots.map((ing) => (
            <PixelItemCard
              key={ing.metalName}
              item={ing.pixelItem}
              label={ing.metalName}
              subtitle="Ingot"
              count={ing.quantity}
              onClick={() =>
                setPreview({
                  kind: 'pixel',
                  title: `${ing.metalName} (ingot)`,
                  subtitleLines: [`Metal: ${ing.metalName}`, `Antal: ${ing.quantity}`],
                  item: ing.pixelItem,
                })
              }
            />
          ))}
        </div>
      )}

      {preview && (
        <ItemPreviewModal
          open
          onClose={() => setPreview(null)}
          item={preview.item}
          title={preview.title}
          subtitleLines={preview.subtitleLines}
        />
      )}
    </div>
  )
}
