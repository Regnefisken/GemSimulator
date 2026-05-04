import type { Dispatch } from 'react'
import { AREAS } from '../../data/areas'
import type { Action } from '../../lib/gameState'
import type { GameState, LocationId } from '../../types'
import LocationCard from './LocationCard'

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
}

export default function MapScreen({ state, dispatch }: Props) {
  function handleEnter(id: LocationId) {
    dispatch({ type: 'CHANGE_LOCATION', location: id })
    dispatch({ type: 'SET_VIEW_MODE', viewMode: 'location' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Verdenskort</h1>
        <p className="text-slate-400 text-sm mt-1">Vælg en lokation at besøge.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AREAS.map((area) => (
          <LocationCard key={area.id} area={area} state={state} onEnter={handleEnter} />
        ))}
      </div>
    </div>
  )
}
