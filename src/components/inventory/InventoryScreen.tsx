import { useState } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import type { Dispatch } from 'react'
import GemInventoryTab from './GemInventoryTab'
import JewelryInventoryTab from './JewelryInventoryTab'
import MaterialsInventoryTab from './MaterialsInventoryTab'
import ToolsInventoryTab from './ToolsInventoryTab'

import EssencesInventoryTab from './EssencesInventoryTab'
import AchievementsTab from './AchievementsTab'

type InvTab = 'gems' | 'jewelry' | 'materials' | 'essences' | 'tools' | 'achievements'

const TABS: { id: InvTab; label: string }[] = [
  { id: 'gems', label: 'Ædelsten' },
  { id: 'jewelry', label: 'Smykker' },
  { id: 'materials', label: 'Råvarer' },
  { id: 'essences', label: 'Essenser' },
  { id: 'tools', label: 'Redskaber' },
  { id: 'achievements', label: 'Præst.' },
]

export default function InventoryScreen({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: Dispatch<Action>
}) {
  const [sub, setSub] = useState<InvTab>('gems')

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Lager</h1>
        <p className="text-slate-500 text-sm mt-1">Ædelsten, råvarer, essenser og hakker — samme pixel-stil i 2D og 3D.</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700 overflow-x-auto scrollbar-thin min-w-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={
              'shrink-0 min-h-[44px] px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ' +
              (sub === t.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'gems' && <GemInventoryTab state={state} />}
      {sub === 'jewelry' && <JewelryInventoryTab state={state} dispatch={dispatch} />}
      {sub === 'materials' && <MaterialsInventoryTab state={state} />}
      {sub === 'essences' && <EssencesInventoryTab state={state} />}
      {sub === 'tools' && <ToolsInventoryTab state={state} dispatch={dispatch} />}
      {sub === 'achievements' && <AchievementsTab state={state} />}
    </div>
  )
}
