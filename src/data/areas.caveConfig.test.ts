import { describe, expect, it } from 'vitest'
import { getCaveConfig, DEFAULT_CAVE_CONFIG } from '../types'
import { AREAS } from './areas'

describe('getCaveConfig', () => {
  it('kobbermine brugerdefineret caveConfig', () => {
    const k = AREAS.find((a) => a.id === 'kobbermine')!
    const cfg = getCaveConfig(k)
    expect(cfg.bounds).toBe(9)
    expect(cfg.crystalMetal).toBe('Kobber')
    expect(cfg.oreSlots).toHaveLength(5)
  })

  it('min uden egne indstillinger fallback til default', () => {
    const j = AREAS.find((a) => a.id === 'jernkloeften')!
    const cfg = getCaveConfig(j)
    expect(cfg).toBe(DEFAULT_CAVE_CONFIG)
  })
})
