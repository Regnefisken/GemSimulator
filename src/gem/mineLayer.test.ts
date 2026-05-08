import { describe, expect, it } from 'vitest'
import { canDescendFromLayer } from './mineLayer'
import type { MineRunSlotState } from '../lib/mineTypes'

function rock(cleared: boolean): MineRunSlotState {
  return {
    slotIndex: 0,
    kind: 'rock',
    rockType: 'normal',
    maxHp: 10,
    currentHp: cleared ? 0 : 5,
    cleared,
  }
}

function chest(cleared: boolean): MineRunSlotState {
  return {
    slotIndex: 1,
    kind: 'chest',
    rockType: 'chest',
    chestTier: 'wood',
    chestEntityId: 'x',
    maxHp: 0,
    currentHp: 0,
    cleared,
    chestLoot: { gold: 1, items: [], blueprintId: null },
  }
}

describe('canDescendFromLayer', () => {
  it('tillader nedstigning når alle klipper/uhyrer er ryddet, selv med ulæst kiste', () => {
    expect(canDescendFromLayer([rock(true), chest(false)])).toBe(true)
  })

  it('blokerer hvis en klippe ikke er ryddet', () => {
    expect(canDescendFromLayer([rock(false), chest(false)])).toBe(false)
  })
})
