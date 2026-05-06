import { describe, expect, it } from 'vitest'
import { BLUEPRINTS, STARTER_BLUEPRINT_IDS } from './blueprints'

describe('blueprints catalog', () => {
  it('har præcis 25 blueprints', () => {
    expect(BLUEPRINTS).toHaveLength(25)
  })

  it('har 3 starter-blueprints', () => {
    expect(STARTER_BLUEPRINT_IDS).toHaveLength(3)
    expect(STARTER_BLUEPRINT_IDS).toEqual(['simple_band', 'stud_earrings', 'basic_pendant'])
  })
})
