import { useMemo } from 'react'
import type { GameState } from '../../types'
import { ACHIEVEMENTS } from '../../data/achievements'

export default function AchievementsTab({ state }: { state: GameState }) {
  const unlocked = useMemo(() => new Set(state.achievementsUnlocked), [state.achievementsUnlocked])
  const count = state.achievementsUnlocked.length

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Låst op: <span className="font-mono text-amber-200/90">{count}</span> / {ACHIEVEMENTS.length}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const ok = unlocked.has(a.id)
          return (
            <li
              key={a.id}
              className={
                'rounded-xl border p-3 flex gap-3 items-start ' +
                (ok
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : 'border-slate-700 bg-slate-800/30 opacity-70')
              }
            >
              <span className="text-2xl shrink-0" aria-hidden>
                {ok ? a.icon : '🔒'}
              </span>
              <div className="min-w-0">
                <div className={'font-semibold ' + (ok ? 'text-amber-100' : 'text-slate-500')}>{a.title}</div>
                <p className="text-xs text-slate-500 mt-1 leading-snug">{a.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
      {count === ACHIEVEMENTS.length && (
        <p className="mt-4 text-sm text-center text-violet-300">Alle præstationer låst op — flere kan komme i fremtidige opdateringer.</p>
      )}
    </div>
  )
}
