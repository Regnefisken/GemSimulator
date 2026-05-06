import type { Area, GameState, LocationId } from '../../types'

type Props = {
  area: Area
  state: GameState
  onEnter: (id: LocationId) => void
}

function formatRequirementsWithState(
  area: Area,
  state: GameState,
): { label: string; met: boolean }[] {
  const r = area.requirement
  if (!r) return []
  const parts: { label: string; met: boolean }[] = []
  if (r.level !== undefined)
    parts.push({ label: `Lvl ${r.level}`, met: state.level >= r.level })
  if (r.reputation !== undefined)
    parts.push({ label: `Omdømme ${r.reputation}`, met: state.reputation >= r.reputation })
  if (r.gold !== undefined)
    parts.push({ label: `${r.gold.toLocaleString()} g`, met: state.gold >= r.gold })
  return parts
}

const KIND_LABEL: Record<Area['kind'], string> = {
  mine: 'Mine',
  smedje: 'Smedje',
  butik: 'Butik',
  smykke: 'Værksted',
}

export default function LocationCard({ area, state, onEnter }: Props) {
  const unlocked = state.unlockedLocations.includes(area.id)
  const isActive = state.viewMode === 'location' && state.currentArea === area.id
  const reqs = formatRequirementsWithState(area, state)
  const hasImage = Boolean(area.image)

  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={() => unlocked && onEnter(area.id)}
      className={[
        'group relative overflow-hidden rounded-2xl text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        hasImage ? 'aspect-[400/231]' : 'min-h-[140px]',
        unlocked
          ? isActive
            ? 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
            : 'hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:scale-[1.02]'
          : 'cursor-not-allowed',
      ].join(' ')}
    >
      {/* Background image / gradient */}
      {hasImage ? (
        <>
          <img
            src={area.image}
            alt=""
            aria-hidden
            className={[
              'absolute inset-0 h-full w-full object-cover transition-all duration-500',
              unlocked
                ? isActive
                  ? 'scale-105 brightness-90'
                  : 'group-hover:scale-105 group-hover:brightness-75 brightness-65'
                : 'brightness-30 grayscale',
            ].join(' ')}
          />
          {/* Gradient overlay – always present, stronger at bottom */}
          <div
            className={[
              'absolute inset-0 transition-opacity duration-300',
              unlocked
                ? isActive
                  ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent'
                  : 'bg-gradient-to-t from-black/75 via-black/20 to-transparent group-hover:from-black/85'
                : 'bg-black/55',
            ].join(' ')}
          />
        </>
      ) : (
        /* Fallback solid card for areas without an image */
        <div
          className={[
            'absolute inset-0 transition-colors duration-300',
            unlocked
              ? isActive
                ? 'bg-amber-500/10 border border-amber-500/60'
                : 'bg-slate-800/90 border border-slate-600 group-hover:bg-slate-800 group-hover:border-slate-500'
              : 'bg-slate-900/70 border border-slate-800',
          ].join(' ')}
        />
      )}

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-4">
        {/* Top row: kind badge + active indicator */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm',
              unlocked
                ? isActive
                  ? 'bg-amber-500/80 text-amber-950'
                  : 'bg-black/40 text-slate-300 group-hover:bg-black/55'
                : 'bg-black/50 text-slate-600',
            ].join(' ')}
          >
            {KIND_LABEL[area.kind]}
          </span>

          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-950 backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-950 animate-pulse" />
              Aktiv
            </span>
          )}

          {!unlocked && (
            <span className="text-xl" aria-hidden>
              🔒
            </span>
          )}
        </div>

        {/* Bottom: name, description, requirements */}
        <div className="space-y-1.5">
          <h3
            className={[
              'text-lg font-bold leading-tight drop-shadow-md',
              unlocked ? 'text-slate-100' : 'text-slate-500',
            ].join(' ')}
          >
            {area.name}
          </h3>

          <p
            className={[
              'text-xs leading-snug drop-shadow',
              unlocked ? 'text-slate-300/90' : 'text-slate-600',
            ].join(' ')}
          >
            {area.description}
          </p>

          {/* Locked requirements */}
          {!unlocked && reqs.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {reqs.map((req) => (
                <span
                  key={req.label}
                  className="rounded bg-red-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 backdrop-blur-sm"
                >
                  {req.label}
                </span>
              ))}
            </div>
          )}

          {/* Unlocked – subtle rarity/depth hint for mines */}
          {unlocked && area.kind === 'mine' && area.depthMultiplier > 0 && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80 drop-shadow">
                Dybde ×{area.depthMultiplier.toFixed(1)}
              </span>
              {area.rarityBonus > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/80 drop-shadow">
                  +{(area.rarityBonus * 100).toFixed(0)}% sjældenhed
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active glow ring (inset border) */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-amber-400/60" />
      )}
    </button>
  )
}
