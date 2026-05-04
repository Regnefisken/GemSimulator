import { useState } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import type { Dispatch } from 'react'
import GemInventoryTab from './GemInventoryTab'
import MaterialsInventoryTab from './MaterialsInventoryTab'
import ToolsInventoryTab from './ToolsInventoryTab'

type InvTab = 'gems' | 'materials' | 'tools'

const TABS: { id: InvTab; label: string }[] = [
  { id: 'gems', label: 'Ædelsten' },
  { id: 'materials', label: 'Råvarer' },
  { id: 'tools', label: 'Redskaber' },
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
        <p className="text-slate-500 text-sm mt-1">Ædelsten, råvarer og hakker — samme pixel-stil i 2D og 3D.</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={
              'flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ' +
              (sub === t.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'gems' && <GemInventoryTab state={state} />}
      {sub === 'materials' && <MaterialsInventoryTab state={state} />}
      {sub === 'tools' && <ToolsInventoryTab state={state} dispatch={dispatch} />}
    </div>
  )
}
