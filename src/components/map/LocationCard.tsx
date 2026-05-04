import type { Area, GameState, LocationId } from '../../types'

type Props = {
  area: Area
  state: GameState
  onEnter: (id: LocationId) => void
}

function formatRequirements(area: Area): string | null {
  const r = area.requirement
  if (!r) return null
  const parts: string[] = []
  if (r.level !== undefined) parts.push(`Lvl ${r.level}`)
  if (r.reputation !== undefined) parts.push(`Omdømme ${r.reputation}`)
  if (r.gold !== undefined) parts.push(`${r.gold} guld`)
  return parts.join(' · ')
}

export default function LocationCard({ area, state, onEnter }: Props) {
  const unlocked = state.unlockedLocations.includes(area.id)
  const isActive =
    state.viewMode === 'location' && state.currentArea === area.id
  const reqText = formatRequirements(area)

  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={() => unlocked && onEnter(area.id)}
      className={
        'text-left rounded-2xl border p-4 transition-all flex flex-col gap-2 min-h-[120px] ' +
        (unlocked
          ? isActive
            ? 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-400/40 hover:bg-amber-500/15'
            : 'border-slate-600 bg-slate-800/80 hover:border-slate-500 hover:bg-slate-800'
          : 'border-slate-800 bg-slate-900/60 opacity-75 cursor-not-allowed grayscale')
      }
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none pixelated" aria-hidden>
          {area.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-100 leading-tight">{area.name}</h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{area.description}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
        {unlocked ? (
          <span className={isActive ? 'text-amber-400' : 'text-emerald-400'}>
            {isActive ? '● Aktiv' : 'Oplåst'}
          </span>
        ) : (
          <>
            <span className="text-slate-500">Låst</span>
            {reqText && <span className="text-slate-500 font-normal normal-case">{reqText}</span>}
          </>
        )}
      </div>
    </button>
  )
}
