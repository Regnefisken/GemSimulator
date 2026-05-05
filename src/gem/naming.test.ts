import { describe, expect, it } from 'vitest'
import { deriveGemName } from './naming'
import { getMagicPropertyByName } from '../data/magic'
import { METALS } from '../data/metals'
import type { GemNameLayers } from './naming'

function layer(p: Partial<GemNameLayers>): GemNameLayers {
  return {
    shapeName: 'Brilliant',
    paletteName: 'Rubin',
    metalInclusions: [],
    magicProperties: [],
    purity: 2,
    isGodTier: false,
    karat: null,
    ...p,
  }
}

describe('deriveGemName', () => {
  it('tom magi + tom metal', () => {
    expect(deriveGemName(layer({}))).toBe('Brilliant Rubin')
  })

  it('1 magi + 1 metal', () => {
    const ild = getMagicPropertyByName('Ild')!
    expect(
      deriveGemName(
        layer({
          magicProperties: [ild],
          metalInclusions: [{ ...METALS.Guld }],
        }),
      ),
    ).toBe('Flamme-Brilliant Rubin med Guldåre')
  })

  it('GodTier + 24K + ild + guld', () => {
    const ild = getMagicPropertyByName('Ild')!
    expect(
      deriveGemName(
        layer({
          isGodTier: true,
          purity: 4,
          karat: 24,
          magicProperties: [ild],
          metalInclusions: [{ ...METALS.Guld }],
        }),
      ),
    ).toBe('Guddommelig Uplettet 24K-Flamme-Brilliant Rubin med Guldåre')
  })

  it('synonym-dedupe Vulkan + Ild', () => {
    const ild = getMagicPropertyByName('Ild')!
    expect(deriveGemName(layer({ paletteName: 'Vulkan', magicProperties: [ild] }))).toBe('Brilliant Vulkan')
  })

  it('3 magi + 3 metaller trigger max length trim', () => {
    const m1 = getMagicPropertyByName('Ild')!
    const m2 = getMagicPropertyByName('Frost')!
    const m3 = getMagicPropertyByName('Lyn')!
    const name = deriveGemName(
      layer({
        isGodTier: true,
        purity: 4,
        karat: 24,
        magicProperties: [m1, m2, m3],
        metalInclusions: [{ ...METALS.Guld }, { ...METALS.Sølv }, { ...METALS.Kobber }],
      }),
    )
    expect(name.length).toBeLessThanOrEqual(60)
  })
})
