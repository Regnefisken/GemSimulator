import { describe, expect, it, vi } from 'vitest'
import { rollBlueprintFromGoldChest } from './mining'

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
