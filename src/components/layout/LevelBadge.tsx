import { useState } from 'react'
import type { GameState } from '../../types'
import { xpToNextLevel } from '../../lib/leveling'
import { isSoundMuted, setSoundMuted } from '../../lib/sounds'

type Props = { state: GameState }

export default function LevelBadge({ state }: Props) {
  const need = xpToNextLevel(state.level)
  const pct = need > 0 ? Math.min(100, (state.xp / need) * 100) : 0
  const [muted, setMuted] = useState(isSoundMuted)

  function toggleSound() {
    const next = !muted
    setMuted(next)
    setSoundMuted(next)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-700 bg-slate-950/95 backdrop-blur-md px-2 sm:px-3 py-2">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-none">
          <span className="text-sm font-bold text-amber-400 whitespace-nowrap shrink-0">Lvl {state.level}</span>
          <div
            className="min-w-0 flex-1 sm:flex-none sm:w-40 max-w-[140px] sm:max-w-none h-1.5 rounded-full bg-slate-800 overflow-hidden"
            title={`${state.xp} / ${need} XP`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0">
            {state.xp}/{need}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg border border-slate-600 bg-slate-800/80 text-lg leading-none hover:bg-slate-700"
            title={muted ? 'Slå lyd til' : 'Slå lyd fra'}
            aria-label={muted ? 'Slå lyd til' : 'Slå lyd fra'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[11px] sm:text-xs font-semibold border border-amber-500/30 max-w-[100px] sm:max-w-none truncate"
            title="Guld"
          >
            🪙 {state.gold}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 text-violet-300 px-2 py-0.5 text-[11px] sm:text-xs font-semibold border border-violet-500/30"
            title="Omdømme"
          >
            ✦ {state.reputation}
          </span>
        </div>
      </div>
    </header>
  )
}
