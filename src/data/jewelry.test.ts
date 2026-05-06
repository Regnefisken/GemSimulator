import { describe, expect, it } from 'vitest'
import type { Gem } from '../types'
import { makeJewelryPixelItemV2 } from './jewelry'
import { JEWELRY_TEMPLATES } from './jewelryTemplates'

function stubGem(overrides: Partial<Gem> = {}): Gem {
  return {
    id: 'g1',
    name: 'Rubin',
    shapeName: 'Brilliant',
    paletteName: 'Rubin',
    purity: 2,
    karat: null,
    data: [],
    colorMap: { G: '#ef4444', D: '#991b1b', L: '#fca5a5', O: '#450a0a', W: '#fecaca' },
    timestamp: '',
    isGodTier: false,
    metalInclusions: [],
    magicProperties: [],
    goldValue: 100,
    ...overrides,
  }
}

describe('makeJewelryPixelItemV2', () => {
  it('bruger simple_band-template og farver g/R/r/s', () => {
    const gem = stubGem()
    const item = makeJewelryPixelItemV2('simple_band', [gem], 'Kobber')
    expect(item.data).toEqual(JEWELRY_TEMPLATES.simple_band!.data)
    expect(item.colorMap.g).toMatch(/^#/)
    expect(item.colorMap.r).toMatch(/^#/)
    expect(item.colorMap.R).toMatch(/^#/)
    expect(item.colorMap.s).toMatch(/^#/)
  })
})
