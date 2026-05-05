import { describe, expect, it } from 'vitest'
import { craftAlloy } from './crafting'

describe('craftAlloy', () => {
  it('kobber + tin → bronze', () => {
    expect(craftAlloy({ a: 'Kobber', b: 'Tin' })).toBe('Bronze')
    expect(craftAlloy({ a: 'Tin', b: 'Kobber' })).toBe('Bronze')
  })

  it('guld + mithril → orichalcum', () => {
    expect(craftAlloy({ a: 'Guld', b: 'Mithril' })).toBe('Orichalcum')
  })

  it('guld + sølv → elektrum', () => {
    expect(craftAlloy({ a: 'Guld', b: 'Sølv' })).toBe('Elektrum')
  })

  it('ukendt par', () => {
    expect(craftAlloy({ a: 'Guld', b: 'Jern' })).toBeNull()
  })
})
