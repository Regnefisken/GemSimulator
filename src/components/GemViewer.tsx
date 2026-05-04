import type { RefObject } from 'react'
import type { Gem } from '../types'
import VoxelScene, { type VoxelSceneHandle } from './VoxelScene'

type Props = {
  gem: Gem | null
  voxelRef: RefObject<VoxelSceneHandle | null>
  onGenerate: () => void
  onDownload: () => void
}

function CurrentName({ gem }: { gem: Gem }) {
  if (gem.purity === 4 && gem.karat) {
    return (
      <h2 className="text-3xl font-bold tracking-widest mb-1">
        <span className="star-3">★★★★</span> {gem.karat}K {gem.name}
      </h2>
    )
  }
  if (gem.purity === 3) {
    return (
      <h2 className="text-3xl font-bold tracking-widest mb-1">
        <span className="star-3">★★★</span> {gem.name}
      </h2>
    )
  }
  if (gem.purity === 1) {
    return (
      <h2 className="text-3xl font-bold tracking-widest mb-1">
        ★ {gem.name}
      </h2>
    )
  }
  if (gem.isGodTier) {
    return (
      <h2 className="text-3xl font-bold tracking-widest mb-1">
        <span className="text-amber-300">✦</span> {gem.name}
      </h2>
    )
  }
  return (
    <h2 className="text-3xl font-bold tracking-widest mb-1">
      {gem.name}
    </h2>
  )
}

export default function GemViewer({ gem, voxelRef, onGenerate, onDownload }: Props) {
  const magic = gem?.magicProperty
  const glowColor = magic ? magic.glow : (gem?.colorMap.G ?? '#eab308')
  const glowOpacity = magic
    ? 0.6
    : gem && (gem.purity === 4 || gem.purity === 3 || gem.isGodTier)
      ? 0.48
      : 0.25
  const glowClassName =
    'absolute inset-0 blur-3xl rounded-3xl pointer-events-none transition-all ' +
    (magic?.name === 'Radioaktiv'
      ? 'glow-radioactive'
      : magic || (gem && (gem.purity === 4 || gem.purity === 3 || gem.isGodTier))
        ? 'gem-glow'
        : '')

  return (
    <section className="flex flex-col items-center">
      <div className="relative gem-container bg-slate-800 p-8 rounded-3xl border-4 border-slate-700 shadow-2xl w-fit">
        <div
          className={glowClassName}
          style={{
            backgroundColor: glowColor,
            opacity: glowOpacity,
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-slate-950 p-5 rounded-2xl shadow-inner border border-slate-600 mb-6 relative">
            <div className="w-[320px] h-[320px] overflow-hidden rounded-sm">
              {gem ? <VoxelScene ref={voxelRef} data={gem.data} colorMap={gem.colorMap} /> : null}
            </div>
          </div>
          {gem && (
            <div className="text-center">
              <CurrentName gem={gem} />
              <div className="flex flex-wrap justify-center gap-2 mb-3 min-h-[24px]">
                {magic && (
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${magic.color}`}
                  >
                    {magic.icon} {magic.name}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-5 py-1 bg-slate-700 rounded-full font-mono text-slate-300">
                  Slebet: {gem.timestamp}
                </span>
                <button
                  type="button"
                  onClick={onDownload}
                  className="flex items-center gap-1.5 px-4 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-2xl transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v-4m0 0l4 4m-4-4l4-4m12 0v4m0 0l-4-4m4 4l-4 4" />
                  </svg>
                  PNG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        className="mt-10 px-10 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-xl rounded-3xl shadow-2xl flex items-center gap-x-4 transition-all active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 4.01V8" />
        </svg>
        <span>Slib Ny Ædelsten</span>
      </button>
    </section>
  )
}
