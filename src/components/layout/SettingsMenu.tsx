import { useState } from 'react'
import { DISPLAY_RENDER_PRESETS } from '../../lib/displayRenderSettings'
import { useDisplayRender } from './DisplayRenderContext'

type Props = {
  onClose: () => void
}

export default function SettingsMenu({ onClose }: Props) {
  const [resetPending, setResetPending] = useState(false)
  const { preset, setPreset, gl } = useDisplayRender()

  function handleResetClick() {
    setResetPending(true)
  }

  function confirmReset() {
    localStorage.removeItem('gem-game-state')
    localStorage.removeItem('gem-collection')
    window.location.reload()
  }

  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} aria-hidden />

      <div
        className="absolute right-0 top-12 z-[56] w-64 rounded-xl border border-slate-700 bg-slate-950/98 shadow-2xl backdrop-blur-md p-3 flex flex-col gap-2"
        role="menu"
        aria-label="Indstillinger"
        onClick={(e) => e.stopPropagation()}
      >
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">💾 Gem</h3>
          <button
            type="button"
            role="menuitem"
            onClick={handleResetClick}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
          >
            🗑️ Nulstil fremskridt
          </button>
        </section>

        <hr className="border-slate-800" />

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">🖥️ Skærmindstillinger</h3>
          <p className="text-[11px] text-slate-500 px-1 mb-2 leading-snug">
            3D-forhåndsvisning (ædelsten m.m.): opløsning (pixelratio) og kantudglatning (MSAA).
          </p>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="3D-gengivelse">
            {DISPLAY_RENDER_PRESETS.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  preset === p.id
                    ? 'border-amber-500/60 bg-amber-950/35'
                    : 'border-transparent hover:bg-slate-800/80'
                }`}
              >
                <input
                  type="radio"
                  name="display-render-preset"
                  value={p.id}
                  checked={preset === p.id}
                  onChange={() => setPreset(p.id)}
                  className="mt-0.5 accent-amber-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-200">{p.title}</span>
                  <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{p.description}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 px-1 font-mono">
            Aktiv: {gl.antialias ? 'MSAA til' : 'MSAA fra'} · {gl.dpr.toFixed(2)}× pixelratio
          </p>
        </section>

        <hr className="border-slate-800" />

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">ℹ️ Om spillet</h3>
          <p className="text-xs text-slate-600 italic px-3 py-1">Kommer snart</p>
        </section>
      </div>

      {resetPending && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setResetPending(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
            className="w-[min(90vw,360px)] rounded-xl border border-amber-500/30 bg-slate-900 p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="reset-confirm-title" className="text-sm text-slate-300">
              ⚠️ Er du sikker? Alt fremskridt slettes permanent.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setResetPending(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold"
              >
                Ja, nulstil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
