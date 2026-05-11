import { useEffect, useRef } from 'react'
import type { GameState, PixelItem } from '../../types'
import { drawGem } from '../../gem/draw2d'
import { effectiveTotalHpMax, effectiveTotalManaMax } from '../../lib/survival'

function MiniPixelIcon({
  item,
  caption,
  menuRasterSrc,
}: {
  item: PixelItem | null
  caption: string
  menuRasterSrc?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (c && item && item.data.length > 0 && !menuRasterSrc) drawGem(c, item.data, item.colorMap, 3)
  }, [item, menuRasterSrc])

  if (menuRasterSrc) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-[64px]">
        <img
          src={menuRasterSrc}
          alt=""
          className="pixelated rounded-md border border-slate-600 bg-slate-950 w-14 h-14 object-contain p-0.5"
        />
        <span className="text-[9px] text-slate-400 text-center leading-tight max-w-[80px] line-clamp-2">
          {caption}
        </span>
      </div>
    )
  }

  if (!item || item.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-[64px]">
        <div className="w-14 h-14 rounded-lg bg-slate-900/90 border border-dashed border-slate-600 flex items-center justify-center text-[9px] text-slate-500 text-center px-1">
          —
        </div>
        <span className="text-[9px] text-slate-500 text-center leading-tight">{caption}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 min-w-[64px]">
      <canvas ref={ref} className="pixelated rounded-md border border-slate-600 bg-slate-950 max-w-[56px] max-h-[56px]" />
      <span className="text-[9px] text-slate-400 text-center leading-tight max-w-[80px] line-clamp-2">
        {caption}
      </span>
    </div>
  )
}

/** Fase 5 (D35): 2D loadout / «character-panel» — kun sprites, ingen 3D-model. */
export default function LoadoutCharacterStrip({ state }: { state: GameState }) {
  const pick = state.pickaxes.find((p) => p.id === state.activePickaxeId) ?? null
  const sw = state.swords.find((s) => s.id === state.activeSwordId) ?? null
  const arm = state.armours.find((a) => a.id === state.activeArmourId) ?? null

  const hp = effectiveTotalHpMax(state)
  const mana = effectiveTotalManaMax(state)
  const armLabel =
    arm == null ? 'Ingen rustning' : arm.durability <= 0 ? `${arm.name} (0 bonus)` : arm.name

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Din udrustning</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[42rem]">
            Aktive hakke, sværd og rustning som 2D-pixel — samme stil som i minen. Ingen ændring af 3D-karakter (D35).
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
          <div>
            Effektivt liv: <span className="text-rose-200/90">{hp}</span>
          </div>
          <div>
            Effektiv mana: <span className="text-violet-200/90">{mana}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center sm:justify-start gap-6 mt-4 pt-3 border-t border-slate-800/80">
        <MiniPixelIcon item={pick?.pixelItem ?? null} menuRasterSrc={pick?.menuIconSrc} caption={pick?.name ?? 'Hakke'} />
        <MiniPixelIcon item={sw?.pixelItem ?? null} menuRasterSrc={sw?.menuIconSrc} caption={sw?.name ?? 'Sværd'} />
        <MiniPixelIcon item={arm?.pixelItem ?? null} caption={armLabel} />
      </div>
    </div>
  )
}
