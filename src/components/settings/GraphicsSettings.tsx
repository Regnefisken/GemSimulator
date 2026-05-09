import { GRAPHICS_PRESETS, type GraphicsPresetId } from '../../gem/graphicsPresets'

type Props = {
  presetId: GraphicsPresetId
  onChange: (id: GraphicsPresetId) => void
}

export default function GraphicsSettings({ presetId, onChange }: Props) {
  const ids = Object.keys(GRAPHICS_PRESETS) as GraphicsPresetId[]

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">⛏️ Mine (3D)</h3>
      <p className="text-[11px] text-slate-500 px-1 mb-2 leading-snug">
        Scener i minen: opløsning på grotten og mængde af dekorative klipper (påvirker ikke felt-RNG eller loot).
      </p>
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Mine grafik">
        {ids.map((id) => {
          const p = GRAPHICS_PRESETS[id]
          return (
            <label
              key={id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                presetId === id
                  ? 'border-amber-500/60 bg-amber-950/35'
                  : 'border-transparent hover:bg-slate-800/80'
              }`}
            >
              <input
                type="radio"
                name="mine-graphics-preset"
                value={id}
                checked={presetId === id}
                onChange={() => onChange(id)}
                className="mt-0.5 accent-amber-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-200">{p.label}</span>
                <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                  {id === 'performance' && 'Lavere pixelratio og færrest dekorative klipper.'}
                  {id === 'balanced' && 'Mellemting — standard for de fleste.'}
                  {id === 'rich' && 'Flere dekorative klipper og højere pixelratio (tungere GPU).'}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
