import { useEffect, useRef } from 'react'
import type { GameState, Gem } from '../../types'
import type { Action } from '../../lib/gameState'
import type { VoxelSceneHandle } from '../VoxelScene'
import GemViewer from '../GemViewer'
import Collection from '../Collection'
import Header from '../Header'
import RepairStation from './RepairStation'
import Smelter from './Smelter'
import AlloyStation from './AlloyStation'
import GemCrafter from './GemCrafter'

type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
  onBack: () => void
  onGoToShop: () => void
  templateCount: number
  currentGem: Gem | null
  onSelectGem: (gem: Gem) => void
  onClearGems: () => void
  onDownload: () => void
  voxelRef: React.RefObject<VoxelSceneHandle | null>
}

export default function SmithyScreen({
  state,
  dispatch,
  onBack,
  onGoToShop,
  templateCount,
  currentGem,
  onSelectGem,
  onClearGems,
  onDownload,
  voxelRef,
}: Props) {
  const expectCraft = useRef(false)
  const firstGemIdBeforeCraft = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!expectCraft.current) return
    expectCraft.current = false
    const nowFirst = state.gems[0]
    if (nowFirst && nowFirst.id !== firstGemIdBeforeCraft.current) {
      onSelectGem(nowFirst)
    }
  }, [state.gems, onSelectGem])

  return (
    <div
      className="space-y-8 min-h-[60vh] rounded-2xl p-1 sm:p-2"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(71,85,105,0.12) 10px, rgba(71,85,105,0.12) 11px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(30,41,59,0.35) 8px, rgba(30,41,59,0.35) 9px)',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2 min-h-[44px] -ml-1 px-1"
      >
        ← Tilbage til kortet
      </button>

      <Header templateCount={templateCount} />

      <RepairStation state={state} dispatch={dispatch} />
      <Smelter state={state} dispatch={dispatch} onGoToShop={onGoToShop} />
      <AlloyStation state={state} dispatch={dispatch} />
      <GemCrafter
        state={state}
        dispatch={dispatch}
        onBeforeCraft={(beforeId) => {
          firstGemIdBeforeCraft.current = beforeId
          expectCraft.current = true
        }}
      />

      <GemViewer gem={currentGem} voxelRef={voxelRef} onDownload={onDownload} />
      {state.gems.length > 1 && (
        <Collection gems={state.gems} onSelect={onSelectGem} onClear={onClearGems} />
      )}
    </div>
  )
}
