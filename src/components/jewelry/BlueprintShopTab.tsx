import { useMemo, useState } from 'react'
import type { BlueprintCategory, GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { BLUEPRINTS } from '../../data/blueprints'
import { playGoldSpend } from '../../lib/sounds'
import BlueprintCard from './BlueprintCard'

const CATEGORY_ORDER: (BlueprintCategory | 'all')[] = [
  'all',
  'ring',
  'necklace',
  'earring',
  'bracelet',
  'brooch',
  'headpiece',
  'amulet',
]

const FILTER_LABEL: Record<BlueprintCategory | 'all', string> = {
  all: 'Alle',
  ring: 'Ringe',
  necklace: 'Halskæder',
  earring: 'Øreringe',
  bracelet: 'Armbånd',
  brooch: 'Brocher',
  headpiece: 'Hovedsmykker',
  amulet: 'Amuletter',
}

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
}

export default function BlueprintShopTab({ state, dispatch }: Props) {
  const [filter, setFilter] = useState<BlueprintCategory | 'all'>('all')

  const rows = useMemo(() => {
    const list = BLUEPRINTS.filter((b) => filter === 'all' || b.category === filter)
    return list.sort((a, b) => {
      const lv = a.requires.level - b.requires.level
      if (lv !== 0) return lv
      return a.name.localeCompare(b.name, 'da')
    })
  }, [filter])

  function buy(bpId: string) {
    playGoldSpend()
    dispatch({ type: 'BUY_BLUEPRINT', blueprintId: bpId })
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Køb blueprint-opskrifter til smykkeværkstedet. Starter- og særlige blueprints fås på anden vis.
      </p>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={
              'min-h-[40px] px-3 rounded-lg text-sm font-semibold ' +
              (filter === id
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
            }
          >
            {FILTER_LABEL[id]}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {rows.map((bp) => {
          const owned = state.unlockedBlueprints.includes(bp.id)
          const levelOk = state.level >= bp.requires.level
          const goldOk = state.gold >= bp.shopPrice
          return (
            <li key={bp.id}>
              <BlueprintCard
                blueprint={bp}
                owned={owned}
                levelOk={levelOk}
                goldOk={goldOk}
                onBuyShop={() => buy(bp.id)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
