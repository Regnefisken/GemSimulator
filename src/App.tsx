import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Gem, GameState } from './types'
import { AREAS } from './data/areas'
import { createPreloadGem, createRandomGem } from './gem/generate'
import { loadState, saveState } from './lib/storage'
import { reducer } from './lib/gameState'
import { TEMPLATES } from './data/templates'
import AppShell from './components/layout/AppShell'
import type { Tab } from './components/layout/TabBar'
import MapScreen from './components/map/MapScreen'
import InventoryScreen from './components/inventory/InventoryScreen'
import Header from './components/Header'
import GemViewer from './components/GemViewer'
import Collection from './components/Collection'
import type { VoxelSceneHandle } from './components/VoxelScene'
import MineScreen from './components/mine/MineScreen'
import {
  JewelryPlaceholder,
  ShopScreenPlaceholder,
  SmithyPlaceholder,
} from './components/placeholders'

function seedState(): GameState {
  const base = loadState()
  if (base.gems.length > 0) return base
  const first = createRandomGem(base.depth)
  const rest = Array.from({ length: 5 }, (_, i) => createPreloadGem(i, base.depth))
  const gems = [first, ...rest].slice(0, base.inventoryCapacity.gems)
  return { ...base, gems, totalGemsFound: gems.length }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, 0, seedState)
  const [tab, setTab] = useState<Tab>('map')
  const [currentGem, setCurrentGem] = useState<Gem | null>(null)
  const voxelRef = useRef<VoxelSceneHandle>(null)

  useLayoutEffect(() => {
    setCurrentGem((c) => {
      if (c && state.gems.some((g) => g.id === c.id)) return c
      return state.gems[0] ?? null
    })
  }, [state.gems])

  useEffect(() => {
    saveState(state)
  }, [state])

  function handleGenerate() {
    const gem = createRandomGem(state.depth)
    dispatch({ type: 'ADD_GEM', gem })
    setCurrentGem(gem)
  }

  function handleSelectGem(gem: Gem) {
    setCurrentGem(gem)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDownload() {
    if (!currentGem || !voxelRef.current) return
    const url = voxelRef.current.toDataURL()
    const a = document.createElement('a')
    let filename = currentGem.name.replace(/ /g, '_')
    const firstMagic = currentGem.magicProperties[0]
    if (firstMagic) filename += `_${firstMagic.name}`
    a.download = `${filename}_${currentGem.timestamp}.png`
    a.href = url
    a.click()
  }

  function handleClear() {
    if (confirm('Slet hele samlingen?')) {
      dispatch({ type: 'CLEAR_GEMS' })
      setCurrentGem(null)
    }
  }

  function goToMapView() {
    dispatch({ type: 'SET_VIEW_MODE', viewMode: 'map' })
  }

  const collection = state.gems

  const smithyContent = (
    <>
      <Header templateCount={TEMPLATES.length} />
      <GemViewer
        gem={currentGem}
        voxelRef={voxelRef}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
      />
      {collection.length > 1 && (
        <Collection gems={collection} onSelect={handleSelectGem} onClear={handleClear} />
      )}
    </>
  )

  let screen: ReactNode

  if (tab === 'inventory') {
    screen = <InventoryScreen state={state} dispatch={dispatch} />
  } else if (tab === 'shop') {
    screen = <ShopScreenPlaceholder onBack={() => setTab('map')} backLabel="← Til kort" />
  } else if (state.viewMode === 'map') {
    screen = <MapScreen state={state} dispatch={dispatch} />
  } else {
    const area = AREAS.find((a) => a.id === state.currentArea)
    if (!area) {
      screen = <MapScreen state={state} dispatch={dispatch} />
    } else if (area.kind === 'mine') {
      screen = <MineScreen area={area} state={state} dispatch={dispatch} onBack={goToMapView} />
    } else if (area.kind === 'smedje') {
      screen = <SmithyPlaceholder onBack={goToMapView}>{smithyContent}</SmithyPlaceholder>
    } else if (area.kind === 'butik') {
      screen = <ShopScreenPlaceholder onBack={goToMapView} />
    } else {
      screen = <JewelryPlaceholder onBack={goToMapView} />
    }
  }

  return (
    <>
      {state.gameNotice && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[85] max-w-[min(90vw,420px)] px-4 py-3 rounded-xl border border-amber-500/40 bg-slate-900/95 text-amber-100 text-sm shadow-xl flex items-start gap-3"
          role="alert"
        >
          <span className="flex-1 pt-0.5">{state.gameNotice}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_GAME_NOTICE' })}
            className="shrink-0 min-w-[44px] min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            OK
          </button>
        </div>
      )}
      <AppShell state={state} tab={tab} onTabChange={setTab}>
        {screen}
      </AppShell>
    </>
  )
}
