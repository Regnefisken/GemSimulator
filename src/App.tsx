import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Gem, GameState } from './types'
import { AREAS } from './data/areas'
import { discoverNewAchievementIds, getAchievementDef } from './data/achievements'
import { createPreloadGem, createRandomGem } from './gem/generate'
import { loadState, saveState } from './lib/storage'
import { reducer } from './lib/gameState'
import { playLevelUp } from './lib/sounds'
import { TEMPLATES } from './data/templates'
import AppShell from './components/layout/AppShell'
import type { Tab } from './components/layout/TabBar'
import MapScreen from './components/map/MapScreen'
import InventoryScreen from './components/inventory/InventoryScreen'
import type { VoxelSceneHandle } from './components/VoxelScene'
import MineScreen from './components/mine/MineScreen'
import SmithyScreen from './components/smithy/SmithyScreen'
import ShopScreen from './components/shop/ShopScreen'
import JewelryWorkshopScreen from './components/jewelry/JewelryWorkshopScreen'
import { ToastProvider, useToast } from './components/ui/ToastContext'
import { DisplayRenderProvider } from './components/layout/DisplayRenderContext'

function seedState(): GameState {
  const base = loadState()
  if (base.gems.length > 0) return base
  const first = createRandomGem(base.depth)
  const rest = Array.from({ length: 5 }, (_, i) => createPreloadGem(i, base.depth))
  const gems = [first, ...rest].slice(0, base.inventoryCapacity.gems)
  return { ...base, gems, totalGemsFound: gems.length }
}

function AppContent() {
  const [state, dispatch] = useReducer(reducer, 0, seedState)
  const stateRef = useRef(state)
  stateRef.current = state
  const [tab, setTab] = useState<Tab>('map')
  const [currentGem, setCurrentGem] = useState<Gem | null>(null)
  const voxelRef = useRef<VoxelSceneHandle>(null)
  const { showToast } = useToast()

  const prevLevel = useRef<number | null>(null)
  const prevUnlocks = useRef<Set<string> | null>(null)
  const announcedAchievements = useRef<Set<string>>(new Set())

  useLayoutEffect(() => {
    setCurrentGem((c) => {
      if (c && state.gems.some((g) => g.id === c.id)) return c
      return state.gems[0] ?? null
    })
  }, [state.gems])

  useEffect(() => {
    const t = window.setTimeout(() => saveState(stateRef.current), 750)
    return () => {
      window.clearTimeout(t)
      saveState(stateRef.current)
    }
  }, [state])

  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK_SMELTING' })
      dispatch({ type: 'PRUNE_EXPIRED_EFFECTS' })
    }, 500)
    return () => window.clearInterval(id)
  }, [dispatch])

  useEffect(() => {
    if (prevLevel.current !== null && state.level > prevLevel.current) {
      showToast(`Level ${state.level}!`, 'gold')
      playLevelUp()
    }
    prevLevel.current = state.level
  }, [state.level, showToast])

  useEffect(() => {
    const cur = new Set(state.unlockedLocations)
    if (prevUnlocks.current === null) {
      prevUnlocks.current = cur
      return
    }
    for (const locId of state.unlockedLocations) {
      if (!prevUnlocks.current.has(locId)) {
        const area = AREAS.find((a) => a.id === locId)
        showToast(`${area?.icon ?? '📍'} ${area?.name ?? locId} er tilgængelig!`, 'success')
      }
    }
    prevUnlocks.current = cur
  }, [state.unlockedLocations, showToast])

  useEffect(() => {
    const newIds = discoverNewAchievementIds(state, state.achievementsUnlocked)
    const fresh = newIds.filter((id) => !announcedAchievements.current.has(id))
    if (fresh.length === 0) return
    for (const id of fresh) {
      announcedAchievements.current.add(id)
      const a = getAchievementDef(id)
      showToast(a ? `🏆 ${a.title}` : `🏆 Præstation`, 'success')
    }
    dispatch({ type: 'UNLOCK_ACHIEVEMENTS', ids: fresh })
  }, [state, dispatch, showToast])

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

  function handleTabChange(next: Tab) {
    setTab(next)
    if (next === 'map') {
      dispatch({ type: 'SET_VIEW_MODE', viewMode: 'map' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  let screen: ReactNode

  if (tab === 'inventory') {
    screen = <InventoryScreen state={state} dispatch={dispatch} />
  } else if (tab === 'shop') {
    screen = <ShopScreen state={state} dispatch={dispatch} onBack={() => setTab('map')} />
  } else if (state.viewMode === 'map') {
    screen = <MapScreen state={state} dispatch={dispatch} />
  } else {
    const area = AREAS.find((a) => a.id === state.currentArea)
    if (!area) {
      screen = <MapScreen state={state} dispatch={dispatch} />
    } else if (area.kind === 'mine') {
      screen = <MineScreen area={area} state={state} dispatch={dispatch} onBack={goToMapView} />
    } else if (area.kind === 'smedje') {
      screen = (
        <SmithyScreen
          state={state}
          dispatch={dispatch}
          onBack={goToMapView}
          onGoToShop={() => setTab('shop')}
          templateCount={TEMPLATES.length}
          currentGem={currentGem}
          onSelectGem={handleSelectGem}
          onClearGems={handleClear}
          onDownload={handleDownload}
          voxelRef={voxelRef}
        />
      )
    } else if (area.kind === 'butik') {
      screen = <ShopScreen state={state} dispatch={dispatch} onBack={goToMapView} />
    } else {
      screen = <JewelryWorkshopScreen state={state} dispatch={dispatch} onBack={goToMapView} />
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
      <AppShell state={state} tab={tab} onTabChange={handleTabChange}>
        {screen}
      </AppShell>
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <DisplayRenderProvider>
        <AppContent />
      </DisplayRenderProvider>
    </ToastProvider>
  )
}
