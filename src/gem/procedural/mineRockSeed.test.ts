import { describe, expect, it } from 'vitest'
import { hashMineRockVisualSeed } from './mineRockSeed'

describe('hashMineRockVisualSeed', () => {
  it('er deterministisk', () => {
    expect(hashMineRockVisualSeed('run-a', 2, 3, 'normal')).toBe(
      hashMineRockVisualSeed('run-a', 2, 3, 'normal'),
    )
  })

  it('skelner slot og type', () => {
    expect(hashMineRockVisualSeed('run-a', 2, 3, 'normal')).not.toBe(
      hashMineRockVisualSeed('run-a', 2, 4, 'normal'),
    )
    expect(hashMineRockVisualSeed('run-a', 2, 3, 'normal')).not.toBe(
      hashMineRockVisualSeed('run-a', 2, 3, 'rich'),
    )
  })
})
