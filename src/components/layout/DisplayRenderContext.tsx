import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadDisplayRenderPreset,
  presetToGlOptions,
  saveDisplayRenderPreset,
  type DisplayRenderPreset,
} from '../../lib/displayRenderSettings'

export type DisplayRenderGlOptions = { dpr: number; antialias: boolean }

type Ctx = {
  preset: DisplayRenderPreset
  setPreset: (p: DisplayRenderPreset) => void
  gl: DisplayRenderGlOptions
}

const DisplayRenderContext = createContext<Ctx | null>(null)

export function DisplayRenderProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DisplayRenderPreset>(() => loadDisplayRenderPreset())

  const setPreset = useCallback((p: DisplayRenderPreset) => {
    setPresetState(p)
    saveDisplayRenderPreset(p)
  }, [])

  const gl = useMemo(() => presetToGlOptions(preset), [preset])

  const value = useMemo(() => ({ preset, setPreset, gl }), [preset, setPreset, gl])

  return <DisplayRenderContext.Provider value={value}>{children}</DisplayRenderContext.Provider>
}

export function useDisplayRender(): Ctx {
  const v = useContext(DisplayRenderContext)
  if (!v) throw new Error('useDisplayRender kræver DisplayRenderProvider')
  return v
}

/** Når VoxelScene bruges uden provider (fx tests), falder vi tilbage til ydelse. */
export function useDisplayRenderGlFallback(): DisplayRenderGlOptions {
  const v = useContext(DisplayRenderContext)
  return v?.gl ?? { dpr: 1, antialias: false }
}
