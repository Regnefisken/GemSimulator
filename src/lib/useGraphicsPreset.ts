import { useCallback, useSyncExternalStore } from 'react'
import {
  DEFAULT_GRAPHICS_PRESET_ID,
  GRAPHICS_PRESETS,
  type GraphicsPresetId,
} from '../gem/graphicsPresets'

const STORAGE_KEY = 'gemSimulator.graphicsPreset'

const listeners = new Set<() => void>()

function isPresetId(v: string | null): v is GraphicsPresetId {
  return v === 'performance' || v === 'balanced' || v === 'rich'
}

function readStored(): GraphicsPresetId {
  if (typeof window === 'undefined') return DEFAULT_GRAPHICS_PRESET_ID
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (isPresetId(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_GRAPHICS_PRESET_ID
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function emit() {
  for (const cb of listeners) cb()
}

function getServerSnapshot(): GraphicsPresetId {
  return DEFAULT_GRAPHICS_PRESET_ID
}

/**
 * Grafik-preset for mine-3D (dpr, kosmetiske klipper, partikelloft).
 * Kerne-mine (slots) påvirkes ikke.
 */
export function useGraphicsPreset(): [GraphicsPresetId, (id: GraphicsPresetId) => void] {
  const id = useSyncExternalStore(subscribe, readStored, getServerSnapshot)

  const setPresetId = useCallback((next: GraphicsPresetId) => {
    if (!GRAPHICS_PRESETS[next]) return
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    emit()
  }, [])

  return [id, setPresetId]
}
