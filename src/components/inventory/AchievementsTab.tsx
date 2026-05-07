import { useMemo } from 'react'
import type { GameState } from '../../types'
import { ACHIEVEMENTS } from '../../data/achievements'

export default function AchievementsTab({ state }: { state: GameState }) {
  const unlocked = useMemo(() => new Set(state.achievementsUnlocked), [state.achievementsUnlocked])
  const count = state.achievementsUnlocked.length

  function progressText(id: string): { value: string; next: string } {
    switch (id) {
      case 'first_gem':
        return {
          value: `Fremskridt ${Math.min(state.totalGemsFound, 1)}/1`,
          next: 'Tip: Find eller slib én ædelsten mere.',
        }
      case 'gems_25':
        return {
          value: `Fremskridt ${Math.min(state.totalGemsFound, 25)}/25`,
          next: 'Tip: Bliv ved i minen og forarbejd rå klipper i Smedjen.',
        }
      case 'depth_50':
        return {
          value: `Fremskridt ${Math.min(state.totalRockSlotsCleared, 50)}/50`,
          next: 'Tip: Ryd flere klippe-felter i minen.',
        }
      case 'depth_200':
        return {
          value: `Fremskridt ${Math.min(state.totalRockSlotsCleared, 200)}/200`,
          next: 'Tip: Hold minedrift i gang over tid.',
        }
      case 'essence_first':
        return {
          value: `Fremskridt ${Math.min(state.totalEssencesCollected, 1)}/1`,
          next: 'Tip: Smelt metaller og hold øje med essensdråber.',
        }
      case 'essence_25':
        return {
          value: `Fremskridt ${Math.min(state.totalEssencesCollected, 25)}/25`,
          next: 'Tip: Brug essensmarkedet og smelt oftere.',
        }
      case 'gold_1000':
        return {
          value: `Fremskridt ${Math.min(state.gold, 1000)}/1000`,
          next: 'Tip: Sælg ædelsten, råvarer og smykker for hurtigere guld.',
        }
      case 'rep_5':
        return {
          value: `Fremskridt ${Math.min(state.reputation, 5)}/5`,
          next: 'Tip: Lav og sælg smykker for mere omdømme.',
        }
      case 'jewelry_craft':
        return {
          value: `Fremskridt ${Math.min(state.jewelry.length, 1)}/1`,
          next: 'Tip: Brug Smykkeværkstedet til at lave dit første smykke.',
        }
      case 'level_10':
        return {
          value: `Fremskridt ${Math.min(state.level, 10)}/10`,
          next: 'Tip: Saml XP via minedrift, smeltning og salg.',
        }
      default:
        return { value: 'Fremskridt —', next: 'Tip: Fortsæt med at spille.' }
    }
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Låst op: <span className="font-mono text-amber-200/90">{count}</span> / {ACHIEVEMENTS.length}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const ok = unlocked.has(a.id)
          const progress = progressText(a.id)
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
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {progress.value} · {progress.next}
                </p>
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
