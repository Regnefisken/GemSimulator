import { describe, expect, it } from 'vitest'
import { pickChestRotationY } from './chestOrientation'

const slots: [number, number, number][] = [
  [0, 0.5, 0],
  [3, 0.5, 0],
  [-2, 0.5, 1],
]

describe('pickChestRotationY', () => {
  it('er deterministisk for samme input', () => {
    const a = pickChestRotationY({
      runId: 'r1',
      depth: 1,
      slotIndex: 0,
      chestX: 0,
      chestZ: 0,
      oreSlots: slots,
      obstacleSlotIndices: [1, 2],
    })
    const b = pickChestRotationY({
      runId: 'r1',
      depth: 1,
      slotIndex: 0,
      chestX: 0,
      chestZ: 0,
      oreSlots: slots,
      obstacleSlotIndices: [1, 2],
    })
    expect(a).toBe(b)
  })

  it('forskellig slotIndex giver typisk anden vinkel', () => {
    const a = pickChestRotationY({
      runId: 'r1',
      depth: 1,
      slotIndex: 0,
      chestX: 0,
      chestZ: 0,
      oreSlots: slots,
      obstacleSlotIndices: [],
    })
    const b = pickChestRotationY({
      runId: 'r1',
      depth: 1,
      slotIndex: 1,
      chestX: 3,
      chestZ: 0,
      oreSlots: slots,
      obstacleSlotIndices: [],
    })
    expect(a).not.toBe(b)
  })
})
