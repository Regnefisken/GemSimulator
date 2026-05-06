import { describe, expect, it } from 'vitest'
import { JEWELRY_TEMPLATES, validateAllTemplates } from './jewelryTemplates'

describe('jewelryTemplates', () => {
  it('har 25 templates der matcher blueprints', () => {
    expect(Object.keys(JEWELRY_TEMPLATES)).toHaveLength(25)
  })

  it('validateAllTemplates() er tom', () => {
    expect(validateAllTemplates()).toEqual([])
  })
})
