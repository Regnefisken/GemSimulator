import { describe, expect, it, vi } from 'vitest'
import { rollBlueprintFromGoldChest, rollLootIngredientDrop } from './mining'

describe('rollLootIngredientDrop (Fase 4)', () => {
  it('returnerer null når chance fejler', () => {
    const rng = vi.fn().mockReturnValue(0.99)
    expect(rollLootIngredientDrop(5, rng)).toBeNull()
    expect(rng).toHaveBeenCalled()
  })

  it('ved lav roll og dybde giver glød-mos som consumable-drop', () => {
    const rng = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0)
    const drop = rollLootIngredientDrop(10, rng)
    expect(drop?.kind).toBe('consumable')
    if (drop?.kind === 'consumable') {
      expect(drop.consumableId).toBe('ing_glow_moss')
      expect(drop.quantity).toBe(1)
    }
  })
})

describe('rollBlueprintFromGoldChest', () => {
  it('returnerer null for ikke-guld-kiste', () => {
    expect(rollBlueprintFromGoldChest('mithrilbjerget', 'silver')).toBeNull()
  })

  it('returnerer null for guld i andre miner', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(rollBlueprintFromGoldChest('kobbermine', 'gold')).toBeNull()
    rnd.mockRestore()
  })

  it('Mithrilbjerget guld: lav roll giver celestial_pendant', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    expect(rollBlueprintFromGoldChest('mithrilbjerget', 'gold')).toBe('celestial_pendant')
    rnd.mockRestore()
  })

  it('Mithrilbjerget guld: høj roll giver intet', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.06)
    expect(rollBlueprintFromGoldChest('mithrilbjerget', 'gold')).toBeNull()
    rnd.mockRestore()
  })

  it('Rune-Dybet guld: lav roll giver dragonscale_bracelet', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    expect(rollBlueprintFromGoldChest('rune-dybet', 'gold')).toBe('dragonscale_bracelet')
    rnd.mockRestore()
  })

  it('Rune-Dybet guld: over 3% giver intet', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.04)
    expect(rollBlueprintFromGoldChest('rune-dybet', 'gold')).toBeNull()
    rnd.mockRestore()
  })
})
