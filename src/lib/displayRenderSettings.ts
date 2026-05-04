export type DisplayRenderPreset = 'performance' | 'balanced' | 'quality'

const STORAGE_KEY = 'gem-display-render-v1'

export const DISPLAY_RENDER_PRESETS: {
  id: DisplayRenderPreset
  title: string
  description: string
}[] = [
  {
    id: 'performance',
    title: 'Ydelse',
    description: '1× opløsning, uden MSAA — lavest GPU-forbrug (som før).',
  },
  {
    id: 'balanced',
    title: 'Balanceret',
    description: 'Op til 1,5× skærm-pixelratio og MSAA — ofte pænere kanter.',
  },
  {
    id: 'quality',
    title: 'Skarp',
    description: 'Op til 2× pixelratio og MSAA — skarpere, tungere ved rotation.',
  },
]

export function loadDisplayRenderPreset(): DisplayRenderPreset {
  if (typeof window === 'undefined') return 'performance'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'performance' || raw === 'balanced' || raw === 'quality') return raw
  } catch {
    /* ignore */
  }
  return 'performance'
}

export function saveDisplayRenderPreset(preset: DisplayRenderPreset): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, preset)
  } catch {
    /* ignore */
  }
}

/** Omsætter valg til WebGL / canvas — `dpr` bruges som Three.js `dpr` og `gl.setPixelRatio`. */
export function presetToGlOptions(preset: DisplayRenderPreset): { dpr: number; antialias: boolean } {
  const device =
    typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : 1
  switch (preset) {
    case 'performance':
      return { dpr: 1, antialias: false }
    case 'balanced':
      return { dpr: Math.min(1.5, Math.max(1, device)), antialias: true }
    case 'quality':
      return { dpr: Math.min(2, Math.max(1, device)), antialias: true }
    default:
      return { dpr: 1, antialias: false }
  }
}
